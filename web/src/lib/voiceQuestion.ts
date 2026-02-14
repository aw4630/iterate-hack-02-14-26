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

/** Specialized voice intents for wake-word flow (Flightsight). */
export type VoiceIntent = 'describe' | 'issues' | 'what_to_check' | 'summarize_scene' | 'help' | null;

/** Returns true if the transcript is the wake phrase "flightsight" or "hey flightsight". */
export function isWakePhrase(transcript: string): boolean {
  return /^(hey\s+)?flightsight\s*$/i.test(transcript.trim());
}

/** Match user's spoken command to a specialized intent. */
export function getVoiceIntent(transcript: string): VoiceIntent {
  const t = transcript.trim().toLowerCase();
  if (!t) return null;
  if (/\bhelp\b/.test(t) || t === 'what can i say' || t === 'what can i ask') return 'help';
  if (/\b(issue|wrong|problem|broken|damage|worn|leak)\b/.test(t)) return 'issues';
  if (/\b(check|inspect|verify|look for)\b/.test(t)) return 'what_to_check';
  if (/\b(describe|what is this|what\'?s this|identify)\b/.test(t)) return 'describe';
  if (/\b(looking at|what am i seeing|what do i see|summarize)\b/.test(t)) return 'summarize_scene';
  return 'describe';
}

/** Question we send to Gemini for a given intent. */
function questionForIntent(intent: VoiceIntent, componentContext: string, detectedLabels: string[]): string {
  const component = componentContext && componentContext !== 'No component selected' ? componentContext : (detectedLabels[0] ?? 'the main component in view');
  switch (intent) {
    case 'help':
      return '';
    case 'issues':
      return `What could be wrong or what issues should I look for on this part: ${component}? Be brief and specific.`;
    case 'what_to_check':
      return `What should I check or inspect on ${component}? Give 2–3 concrete steps.`;
    case 'describe':
      return `In one or two sentences, what is ${component} and its role on the aircraft?`;
    case 'summarize_scene':
      return `In one or two sentences, what is the main component I'm looking at? Components in view: ${detectedLabels.join(', ') || 'unknown'}. Focus on the most prominent one.`;
    default:
      return `Briefly describe ${component}.`;
  }
}

export const VOICE_HELP_RESPONSE =
  "You can say: describe this component, any issues here, what should I check, or what am I looking at. Say Flightsight again to ask another question.";

function buildPrompt(question: string, componentContext: string, techProfileSummary?: string, kbContext?: string, forVoice = false): string {
  const context = techProfileSummary
    ? `\nTechnician context (answer with this in mind): ${techProfileSummary}\n`
    : '';
  const kbSection = kbContext
    ? `\nMAINTENANCE MANUAL REFERENCES (real data from Cessna 172 SM D2065-3-13 and/or Lycoming O-320 OM 60297-22 — use this and cite page numbers):\n${kbContext}\n`
    : '';
  const voiceInstruction = forVoice
    ? '\nAnswer in a brief, conversational way as if giving verbal instructions. 2–3 sentences, natural tone. No bullet lists.'
    : '';
  return `The user is an aircraft maintenance technician asking about a component they're looking at during maintenance.

Component: ${componentContext || 'No specific component selected.'}
${context}${kbSection}
User's question: "${question}"
${voiceInstruction}

Answer as an aircraft maintenance expert. Use the MANUAL REFERENCES data above if relevant — cite the exact page numbers and which manual (e.g. "per Cessna SM p.377, Fig 15-2" or "per O-320 OM p.34"). Also mention part numbers, torque values, safety warnings, and compliance requirements where relevant. Keep it concise (2–4 sentences).`;
}

async function askDedalus(question: string, componentContext: string, apiKey: string, profile: PersonProfile | null, kbContext?: string, forVoice = false): Promise<string> {
  const model = env.dedalusVoiceModel;
  const res = await fetch(`${DEDALUS_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: buildPrompt(question, componentContext, profile ? profileSummary(profile) : undefined, kbContext, forVoice) }],
      max_tokens: 400,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) setDedalus429();
    throw new Error(`Voice answer: ${res.status}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? 'No response.';
}

async function askGoogle(question: string, componentContext: string, apiKey: string, profile: PersonProfile | null, kbContext?: string, forVoice = false): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(question, componentContext, profile ? profileSummary(profile) : undefined, kbContext, forVoice) }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
    }),
  });
  if (!res.ok) throw new Error(`Voice answer: ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'No response.';
}

export async function askGeminiAboutProduct(question: string, componentContext: string, profile: PersonProfile | null = null, forVoice = false): Promise<string> {
  const apiKey = env.dedalusVoiceApiKey;
  if (!apiKey) throw new Error('No API key (set VITE_GEMINI_API_KEY or VITE_DEDALUS_VOICE_API_KEY)');

  const kbResult = await searchKB(componentContext, 3);
  const kbContext = kbResult.contextText || undefined;

  if (isDedalusApiKey(apiKey)) return askDedalus(question, componentContext, apiKey, profile, kbContext, forVoice);
  return askGoogle(question, componentContext, apiKey, profile, kbContext, forVoice);
}

/** Get conversational answer for a voice intent (wake-word flow). Returns help text for "help", else calls Gemini with specialized question. */
export async function getAnswerForVoiceIntent(
  intent: VoiceIntent,
  componentContext: string,
  detectedLabels: string[],
  profile: PersonProfile | null
): Promise<string> {
  if (intent === 'help') return VOICE_HELP_RESPONSE;
  const question = questionForIntent(intent, componentContext, detectedLabels);
  return askGeminiAboutProduct(question, componentContext, profile, true);
}
