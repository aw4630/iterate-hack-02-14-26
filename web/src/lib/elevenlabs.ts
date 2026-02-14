/**
 * ElevenLabs text-to-speech: convert text to speech and play via browser Audio.
 * Used for conversational voice responses (e.g. after "Flightsight" wake word + command).
 */

import { env } from './env';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Speak the given text using ElevenLabs TTS. Returns a Promise that resolves when playback finishes or rejects on error.
 * Requires VITE_ELEVENLABS_API_KEY to be set.
 */
export async function speakWithElevenLabs(text: string): Promise<void> {
  const apiKey = env.elevenLabsApiKey;
  if (!apiKey) throw new Error('ElevenLabs API key not set (VITE_ELEVENLABS_API_KEY)');

  const voiceId = env.elevenLabsVoiceId;
  const url = `${ELEVENLABS_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128&optimize_streaming_latency=2`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: text.slice(0, 5000), // API limit; keep responses concise
      model_id: 'eleven_turbo_v2_5',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs TTS error: ${res.status} ${errText.slice(0, 150)}`);
  }

  const blob = await res.blob();
  const audioUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error('Audio playback failed'));
    };
    audio.play().catch(reject);
  });
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(env.elevenLabsApiKey && env.elevenLabsApiKey.startsWith('sk_'));
}
