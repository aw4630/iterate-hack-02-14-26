/**
 * Text-to-speech: ElevenLabs API with guaranteed fallback to browser speechSynthesis.
 * Ensures the user always hears audio from the laptop.
 */

import { env } from './env';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new Ctx();
  }
  return audioContext;
}

/** Resume audio context on user gesture so playback is allowed. Call from click handler. */
export function unlockAudio(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (_) {}
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(env.elevenLabsApiKey && env.elevenLabsApiKey.trim() !== '');
}

/** Browser TTS fallback – always works, no API key. */
function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    const t = text.trim() || ' ';
    if (!t) {
      resolve();
      return;
    }
    const u = new SpeechSynthesisUtterance(t);
    u.rate = 0.95;
    u.pitch = 1;
    u.volume = 1;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
}

/** Play MP3 buffer through Web Audio API (same context as user gesture) or HTML Audio. */
function playMp3Buffer(buffer: ArrayBuffer): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();

  return new Promise((resolve, reject) => {
    ctx.decodeAudioData(buffer.slice(0), (decoded) => {
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.connect(ctx.destination);
      src.onended = () => resolve();
      src.start(0);
    }, () => {
      // decodeAudioData failed (e.g. MP3 not supported) – use HTML Audio
      const blob = new Blob([buffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = 1;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Playback failed'));
      };
      audio.play().catch(reject);
    });
  });
}

/**
 * Speak text out loud. Uses ElevenLabs if configured and successful;
 * otherwise uses browser speechSynthesis so you always hear something.
 */
export function speak(text: string): Promise<void> {
  const t = text.trim() || ' ';
  if (!t) return Promise.resolve();

  const apiKey = env.elevenLabsApiKey;
  if (!apiKey) return speakWithBrowser(text);

  const voiceId = env.elevenLabsVoiceId;
  const url = `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`;

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: t,
      model_id: 'eleven_turbo_v2_5',
    }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body ? `${res.status}: ${body.slice(0, 80)}` : `ElevenLabs ${res.status}`);
      }
      return res.arrayBuffer();
    })
    .then((buffer) => playMp3Buffer(buffer))
    .catch((err) => {
      console.warn('ElevenLabs TTS failed, using browser voice:', err);
      return speakWithBrowser(text);
    });
}
