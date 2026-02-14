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
    ? `\nCESSNA 172 SERVICE MANUAL REFERENCE (real data from D2065-3-13 — use this and cite page numbers):\n${kbContext}\n`
    : '';
  return `The user is an aircraft maintenance technician asking about a component they're looking at during maintenance.

Component: ${componentContext || 'No specific component selected.'}
${context}${kbSection}
User's question: "${question}"

Answer as an aircraft maintenance expert. Use the SERVICE MANUAL REFERENCE data above if relevant — cite the exact page numbers (e.g. "per SM p.377, Fig 15-2"). Also mention part numbers, torque values, safety warnings, and compliance requirements where relevant. Keep it concise (2–4 sentences).`;
}

async function askDedalus(question: string, componentContext: string, apiKey: string, profile: PersonProfile | null, kbContext?: string): Promise<string> {
  const model = env.dedalusVoiceModel;
  const res = await fetch(`${DEDALUS_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`Voice answer: ${res.status}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? 'No response.';
}

async function askGoogle(question: string, componentContext: string, apiKey: string, profile: PersonProfile | null, kbContext?: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(question, componentContext, profile ? profileSummary(profile) : undefined, kbContext) }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
    }),
  });
  if (!res.ok) throw new Error(`Voice answer: ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'No response.';
}

export async function askGeminiAboutProduct(question: string, componentContext: string, profile: PersonProfile | null = null): Promise<string> {
  const apiKey = env.dedalusVoiceApiKey;
  if (!apiKey) throw new Error('No API key (set VITE_GEMINI_API_KEY or VITE_DEDALUS_VOICE_API_KEY)');

  // RAG: search for relevant manual content
  const kbResult = await searchKB(componentContext, 3);
  const kbContext = kbResult.contextText || undefined;

  if (isDedalusApiKey(apiKey)) return askDedalus(question, componentContext, apiKey, profile, kbContext);
  return askGoogle(question, componentContext, apiKey, profile, kbContext);
}
