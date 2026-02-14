/**
 * Send user's question (e.g. from voice transcript) + component context to Dedalus or Gemini; get text answer.
 * Uses Dedalus when the API key is a Dedalus key (dsk-...) or when VITE_DEDALUS_VOICE_API_KEY is set.
 */

import { env, isDedalusApiKey } from './env';
import { setDedalus429 } from './dedalusRateLimit';
import type { PersonProfile } from './rag';
import { profileSummary } from './rag';
import { searchKB } from './knowledgeBase';

const DEDALUS_BASE = 'https://api.dedaluslabs.ai';

function buildPrompt(question: string, componentContext: string, techProfileSummary?: string, kbContext?: string): string {
  const context = techProfileSummary
    ? `\nTechnician context (answer with this in mind): ${techProfileSummary}\n`
    : '';
  const kbSection = kbContext
    ? `\nMAINTENANCE MANUAL REFERENCES (real data from Cessna 172 SM D2065-3-13 and/or Lycoming O-320 OM 60297-22 — use this and cite page numbers):\n${kbContext}\n`
    : '';
  return `The user is an aircraft maintenance technician asking about a component they're looking at during maintenance.

Component: ${componentContext || 'No specific component selected.'}
${context}${kbSection}
User's question: "${question}"

Answer as an aircraft maintenance expert in a conversational, instructional way — as if you're talking to the technician. Use the MANUAL REFERENCES data above if relevant — cite the exact page numbers and which manual (e.g. "per Cessna SM p.377, Fig 15-2" or "per O-320 OM p.34"). Mention part numbers, torque values, safety warnings, and compliance where relevant. Keep it concise (2–4 sentences). If the question is too broad (e.g. "what am I looking at" with no specific part), briefly say to select or point at one component and ask something focused like: any issues with this part? what is this component? or inspection checklist for this part.`;
}

/** Message spoken when user says "help" in Flightsight voice mode. */
export const FLIGHTSIGHT_HELP_MESSAGE =
  "You can ask focused questions about the part you're looking at. For example: Any issues with this part? What is this component? What should I check during inspection? Or: What's the torque for this? Say Flightsight again when you're ready to ask.";

/** True if the transcript is a help request (e.g. "help", "what can I ask"). */
export function isHelpIntent(transcript: string): boolean {
  const t = transcript.trim().toLowerCase();
  if (!t) return false;
  if (/^(help|what can I ask|options|what do you do)\s*\.?$/i.test(t)) return true;
  if (/^how (do I )?use (this|you|flightsight)/i.test(t)) return true;
  return false;
}

async function askDedalus(question: string, componentContext: string, apiKey: string, profile: PersonProfile | null, kbContext?: string): Promise<string> {
  const model = env.dedalusVoiceModel;
  const res = await fetch(`${DEDALUS_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: buildPrompt(question, componentContext, profile ? profileSummary(profile) : undefined, kbContext) }],
      max_tokens: 400,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) setDedalus429();
    const body = await res.text();
    const err = new Error(body ? `Voice answer: ${res.status} ${body.slice(0, 100)}` : `Voice answer: ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? 'No response.';
}

async function askGoogleWithPrompt(promptText: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
    }),
  });
  if (!res.ok) throw new Error(`Voice answer: ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'No response.';
}

async function askGoogle(question: string, componentContext: string, apiKey: string, profile: PersonProfile | null, kbContext?: string): Promise<string> {
  const promptText = buildPrompt(question, componentContext, profile ? profileSummary(profile) : undefined, kbContext);
  return askGoogleWithPrompt(promptText, apiKey);
}

export async function askGeminiAboutProduct(question: string, componentContext: string, profile: PersonProfile | null = null): Promise<string> {
  if (isHelpIntent(question)) return FLIGHTSIGHT_HELP_MESSAGE;

  const apiKey = env.dedalusVoiceApiKey;
  if (!apiKey) throw new Error('No API key (set VITE_GEMINI_API_KEY or VITE_DEDALUS_VOICE_API_KEY)');

  const kbResult = await searchKB(componentContext, 3);
  const kbContext = kbResult.contextText || undefined;

  if (isDedalusApiKey(apiKey)) {
    try {
      return await askDedalus(question, componentContext, apiKey, profile, kbContext);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      const fallbackKey = env.googleVoiceFallbackKey;
      if ((status === 404 || status === 502) && fallbackKey && !fallbackKey.startsWith('dsk-')) {
        return askGoogle(question, componentContext, fallbackKey, profile, kbContext);
      }
      throw err;
    }
  }
  return askGoogle(question, componentContext, apiKey, profile, kbContext);
}
