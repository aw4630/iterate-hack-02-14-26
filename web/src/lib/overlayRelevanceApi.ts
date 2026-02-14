/**
 * Batch API: get short relevance phrase per component for overlay (AD Required, Critical, Due for inspection, etc.).
 */

import { env, isDedalusApiKey } from './env';
import { isDedalusBackoff, setDedalus429, DEDALUS_BACKOFF_MS } from './dedalusRateLimit';
import type { PersonProfile } from './rag';
import { profileSummary } from './rag';

const DEDALUS_BASE = 'https://api.dedaluslabs.ai';

function buildPrompt(labels: string[], profile: PersonProfile): string {
  const summary = profileSummary(profile);
  return `You are helping an aircraft maintenance technician see which components are relevant to their current work at a glance.

Components currently visible (use these exact labels): ${labels.map((l) => `"${l}"`).join(', ')}

Technician context: ${summary}

For each component that is relevant to their current work, output a SHORT phrase (2–5 words) saying why:
- Task card match: "On task card", "Inspect per WO"
- AD compliance: "AD Required", "Check AD 2024-15-06"
- Criticality: "Critical", "Safety-critical", "Life-limited"
- Inspection status: "Due for inspection", "Check service life"
- Compatibility: "Fits ${profile.workContext?.aircraftType ?? 'this aircraft'}"
- Safety: "Caution: hot surface", "PPE required"
- Combine with · only if 2 reasons: "On task card · AD Required"

Only include components that match at least one criterion. Use the exact component label as in the list.
Respond with ONLY a JSON array, no other text. Format: [{"label": "exact component name", "relevance": "short phrase"}]
Example: [{"label": "spark plug", "relevance": "On task card · Inspect"}, {"label": "engine mount bolt", "relevance": "AD Required"}]`;
}

async function fetchDedalus(labels: string[], profile: PersonProfile, apiKey: string): Promise<Record<string, string>> {
  if (labels.length === 0 || isDedalusBackoff(DEDALUS_BACKOFF_MS)) return {};
  const res = await fetch(`${DEDALUS_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash',
      messages: [{ role: 'user', content: buildPrompt(labels, profile) }],
      max_tokens: 400,
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) setDedalus429();
    return {};
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim() ?? '[]';
  return parseRelevanceJson(text, labels);
}

async function fetchGoogle(labels: string[], profile: PersonProfile, apiKey: string): Promise<Record<string, string>> {
  if (labels.length === 0) return {};
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(labels, profile) }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) return {};
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '[]';
  return parseRelevanceJson(text, labels);
}

function parseRelevanceJson(text: string, labels: string[]): Record<string, string> {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const map: Record<string, string> = {};
  try {
    const arr = JSON.parse(cleaned) as unknown[];
    if (!Array.isArray(arr)) return map;
    for (const o of arr) {
      if (o && typeof o === 'object' && typeof (o as { label?: string }).label === 'string' && typeof (o as { relevance?: string }).relevance === 'string') {
        const label = (o as { label: string }).label.trim();
        const relevance = (o as { relevance: string }).relevance.trim();
        if (!relevance) continue;
        const key = labels.find((l) => l.toLowerCase() === label.toLowerCase()) ?? label;
        map[key] = relevance;
      }
    }
  } catch {
    // ignore
  }
  return map;
}

export async function fetchOverlayRelevance(labels: string[], profile: PersonProfile | null): Promise<Record<string, string>> {
  if (!profile || labels.length === 0) return {};
  const apiKey = env.geminiApiKey;
  if (!apiKey) return {};
  try {
    if (isDedalusApiKey(apiKey)) return fetchDedalus(labels, profile, apiKey);
    return fetchGoogle(labels, profile, apiKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('429') || msg.includes('Too Many')) setDedalus429();
    return {};
  }
}
