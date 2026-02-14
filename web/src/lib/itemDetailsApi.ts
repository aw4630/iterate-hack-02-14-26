/**
 * Fetch aircraft component details (specs, maintenance, safety) from Gemini/Dedalus.
 * When profile is provided, analysis is tailored to current work context (aircraft type, task card, certifications).
 */

import { env, isDedalusApiKey } from './env';
import { setDedalus429 } from './dedalusRateLimit';
import type { ItemDetails } from './itemDetails';
import type { PersonProfile } from './rag';
import { profileSummary } from './rag';
import { searchKB } from './knowledgeBase';

const DEDALUS_BASE = 'https://api.dedaluslabs.ai';

function buildDetailsPrompt(label: string, profile: PersonProfile | null, withImage: boolean, kbContext?: string): string {
  const ragContext = profile ? `\n\nTECHNICIAN CONTEXT (use this to tailor the response to their current work):\n${profileSummary(profile)}` : '';
  const kbSection = kbContext ? `\n\nCESSNA 172 SERVICE MANUAL REFERENCE (use this data — it is from the actual manual D2065-3-13):\n${kbContext}` : '';
  return `You are an aircraft maintenance expert with knowledge of the Cessna 172 Service Manual (D2065-3-13) and general aviation maintenance practices. You MUST always give concrete answers. Never respond with "Unknown", "check manual", or "—" as a final answer.
${withImage ? 'Look at the aircraft component in the image. Identify the exact part (manufacturer and part number) if visible; otherwise infer from shape/context and aircraft type.' : ''}
${kbSection ? 'IMPORTANT: The SERVICE MANUAL REFERENCE section below contains REAL data from the Cessna 172 SM. Use this data for your response — cite the exact page numbers and section numbers provided.' : ''}
For the component "${label}":
- Use the image, the manual reference data below, and your maintenance knowledge to identify the part and provide all fields.
- If the part number is not visible, give your best estimate for this type of component on the likely aircraft.
- PART NUMBER: Manufacturer part number. If not visible, provide the standard/common part number for this component.
- SPECS: Material, weight, service life or TBO, operating limits or tolerances.
- SAFETY: Required PPE, hazards, warnings. Be specific — e.g. "torque wrench required: 300–360 in-lbs" not just "use tools."
- PROCEDURES: Key inspection/maintenance steps. Reference manual sections (e.g. "SM Section 11, p.305") with PAGE NUMBERS.
- COMPATIBILITY: Aircraft models this part fits. State clearly if it's specific to a model series.
- PRICE: Estimated costs from aviation suppliers. Format: "Aircraft Spruce $X.XX, Aviall $X.XX, SkyGeek $X.XX" (use realistic estimates; at least 2–3 suppliers).
- INSTALLATION: Torque values, special tools, sequence notes. Reference applicable manual section with page number.
- AD REFERENCES: Any relevant Airworthiness Directives or Service Bulletins affecting this component.${ragContext}${kbSection}

Reply in this exact format (short lines, labels in caps):
COMPONENT: <exact part name and number if visible, otherwise specific component type>
PART NUMBER: ...
MANUFACTURER: ...
SPECS: material, weight, service life, operating limits
SAFETY: PPE and hazards
PROCEDURES: key maintenance steps with manual page references
COMPATIBILITY: aircraft models
PRICE: Aircraft Spruce $X.XX, Aviall $X.XX, ...
INSTALLATION: torque values, tools, sequence
AD REFERENCES: applicable ADs or SBs`;
}

function parseDetailsText(label: string, text: string): ItemDetails {
  const details: ItemDetails = { name: label };
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.toUpperCase().startsWith('COMPONENT:')) {
      const v = line.replace(/^component:\s*/i, '').trim();
      if (v && v !== label) details.name = v;
    }
    if (line.toUpperCase().startsWith('PART NUMBER:')) {
      const v = line.replace(/^part number:\s*/i, '').trim();
      if (v && !/unknown/i.test(v)) details.partNumber = v;
    }
    if (line.toUpperCase().startsWith('MANUFACTURER:')) {
      const v = line.replace(/^manufacturer:\s*/i, '').trim();
      if (v && !/unknown/i.test(v)) details.manufacturer = v;
    }
    if (line.toUpperCase().startsWith('SPECS:')) {
      const v = line.replace(/^specs:\s*/i, '').trim();
      if (v) {
        details.specs = {
          material: v,
          serviceLife: 'See parsed data',
        };
      }
    }
    if (line.toUpperCase().startsWith('SAFETY:')) {
      const v = line.replace(/^safety:\s*/i, '').trim();
      if (v) details.safetyInfo = v.split(/[;.]/).map((s) => s.trim()).filter(Boolean);
    }
    if (line.toUpperCase().startsWith('PROCEDURES:')) {
      const v = line.replace(/^procedures:\s*/i, '').trim();
      if (v) {
        details.procedures = v.split(/[;.]/).map((s) => s.trim()).filter(Boolean);
      }
    }
    if (line.toUpperCase().startsWith('PRICE:')) {
      const v = line.replace(/^price:\s*/i, '').trim();
      const parts = v.split(',').map((s) => s.trim()).filter(Boolean);
      const elsewhere: { store: string; price: number }[] = [];
      let aircraftSpruce: number | undefined;
      for (const part of parts) {
        const match = part.match(/(.+?)\s*\$?(\d+\.?\d*)\s*$/);
        if (match) {
          const store = match[1].trim();
          const price = parseFloat(match[2]);
          if (/aircraft spruce/i.test(store)) aircraftSpruce = price;
          else elsewhere.push({ store, price });
        }
      }
      if (aircraftSpruce != null) details.priceAtAircraftSpruce = aircraftSpruce;
      if (elsewhere.length) details.priceElsewhere = elsewhere;
    }
    if (line.toUpperCase().startsWith('INSTALLATION:')) {
      const v = line.replace(/^installation:\s*/i, '').trim();
      details.installationNotes = v;
    }
    if (line.toUpperCase().startsWith('COMPATIBILITY:')) {
      const v = line.replace(/^compatibility:\s*/i, '').trim();
      details.compatibilitySummary = v;
    }
    if (line.toUpperCase().startsWith('AD REFERENCES:') || line.toUpperCase().startsWith('AD:')) {
      const v = line.replace(/^ad\s*references?:\s*/i, '').replace(/^ad:\s*/i, '').trim();
      if (v && !/none|n\/a/i.test(v)) {
        details.adReferences = { 'AD/SB': v };
      }
    }
  }

  if (!details.installationNotes && text.length > 0) {
    details.installationNotes = 'Refer to applicable maintenance manual.';
  }
  return details;
}

async function fetchDetailsDedalus(label: string, apiKey: string, profile: PersonProfile | null, imageBase64?: string, kbContext?: string): Promise<ItemDetails> {
  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
    { type: 'text', text: buildDetailsPrompt(label, profile, Boolean(imageBase64), kbContext) },
  ];
  if (imageBase64) {
    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } });
  }
  const res = await fetch(`${DEDALUS_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash',
      messages: [{ role: 'user', content }],
      max_tokens: 768,
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) setDedalus429();
    throw new Error(`Dedalus details: ${res.status}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim() ?? '';
  return parseDetailsText(label, text);
}

async function fetchDetailsGoogle(label: string, apiKey: string, profile: PersonProfile | null, imageBase64?: string, kbContext?: string): Promise<ItemDetails> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: buildDetailsPrompt(label, profile, Boolean(imageBase64), kbContext) },
  ];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 768 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini details: ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  return parseDetailsText(label, text);
}

export async function fetchItemDetailsFromGemini(
  label: string,
  profile: PersonProfile | null = null,
  imageBase64?: string
): Promise<ItemDetails> {
  const apiKey = env.geminiApiKey;
  if (!apiKey) throw new Error('No API key for details');

  // RAG: search the knowledge base for relevant manual content
  const kbResult = await searchKB(label, 4);
  const kbContext = kbResult.contextText || undefined;

  let details: ItemDetails;
  if (isDedalusApiKey(apiKey)) {
    details = await fetchDetailsDedalus(label, apiKey, profile, imageBase64, kbContext);
  } else {
    details = await fetchDetailsGoogle(label, apiKey, profile, imageBase64, kbContext);
  }

  // Attach manual references from KB
  if (kbResult.refs.length > 0) {
    details.manualRefs = kbResult.refs;
  }

  return details;
}
