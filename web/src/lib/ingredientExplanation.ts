/**
 * Ask Gemini what a specific spec/parameter means for an aircraft component (for clickable procedures).
 */

import { env, isDedalusApiKey } from './env';
import { setDedalus429 } from './dedalusRateLimit';

const DEDALUS_BASE = 'https://api.dedaluslabs.ai';

function buildPrompt(specOrProcedure: string, componentName: string): string {
  return `For the aircraft component "${componentName}", explain the maintenance step or specification "${specOrProcedure}" in 2–3 sentences: what it means (e.g. inspection criteria, torque requirement, measurement tolerance), why it matters for airworthiness, and any safety implications. Reference applicable manual sections if relevant. Plain text, concise.`;
}

async function askDedalus(specOrProcedure: string, componentName: string, apiKey: string): Promise<string> {
  const res = await fetch(`${DEDALUS_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash',
      messages: [{ role: 'user', content: buildPrompt(specOrProcedure, componentName) }],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) setDedalus429();
    throw new Error(`Spec explanation: ${res.status}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? 'No response.';
}

async function askGoogle(specOrProcedure: string, componentName: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(specOrProcedure, componentName) }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
    }),
  });
  if (!res.ok) throw new Error(`Spec explanation: ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'No response.';
}

export async function getIngredientExplanation(specOrProcedure: string, componentName: string): Promise<string> {
  const apiKey = env.geminiApiKey;
  if (!apiKey) throw new Error('No API key');
  if (isDedalusApiKey(apiKey)) return askDedalus(specOrProcedure, componentName, apiKey);
  return askGoogle(specOrProcedure, componentName, apiKey);
}
