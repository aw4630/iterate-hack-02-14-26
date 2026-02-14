// Env vars (Vite exposes VITE_* to client)
// Copy .env.example to .env and fill in.

export const env = {
  get geminiApiKey(): string {
    return import.meta.env.VITE_GEMINI_API_KEY ?? '';
  },
  get openClawHost(): string {
    return import.meta.env.VITE_OPENCLAW_HOST ?? '';
  },
  get openClawPort(): string {
    return import.meta.env.VITE_OPENCLAW_PORT ?? '18789';
  },
  get openClawToken(): string {
    return import.meta.env.VITE_OPENCLAW_GATEWAY_TOKEN ?? '';
  },
  get aeroDetectApiUrl(): string {
    return import.meta.env.VITE_AERODETECT_API_URL ?? '';
  },
  /** Optional: Dedalus key for voice Q&A only. If set, voice uses Dedalus (not Gemini). Falls back to VITE_GEMINI_API_KEY. */
  get dedalusVoiceApiKey(): string {
    return import.meta.env.VITE_DEDALUS_VOICE_API_KEY ?? import.meta.env.VITE_GEMINI_API_KEY ?? '';
  },
  /** Dedalus model for voice Q&A. Use same as detection (google/gemini-2.0-flash) for compatibility. */
  get dedalusVoiceModel(): string {
    return import.meta.env.VITE_DEDALUS_VOICE_MODEL ?? 'google/gemini-2.0-flash';
  },
  /** Optional: use a separate key for Gemini Live (Google). Set when using Dedalus for detection. */
  get geminiLiveApiKey(): string {
    return import.meta.env.VITE_GEMINI_LIVE_API_KEY ?? env.geminiApiKey ?? '';
  },
  /** Optional: Google API key for voice when Dedalus returns 404. Get one at aistudio.google.com/apikey */
  get googleVoiceFallbackKey(): string {
    return (import.meta.env.VITE_GOOGLE_VOICE_API_KEY as string)?.trim() ?? '';
  },
  /** ElevenLabs API key for TTS (conversational voice responses). */
  get elevenLabsApiKey(): string {
    return import.meta.env.VITE_ELEVENLABS_API_KEY ?? '';
  },
  /** ElevenLabs voice ID. Default: Rachel (conversational). */
  get elevenLabsVoiceId(): string {
    return import.meta.env.VITE_ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';
  },
  /** Optional: full URL to manual PDF if local /manuals/ file fails (e.g. symlink on Windows). Example: https://yoursite.com/cessna172-sm.pdf */
  get manualPdfBaseUrl(): string {
    return (import.meta.env.VITE_MANUAL_PDF_URL as string)?.trim() ?? '';
  },
};

/** True if the key is a Dedalus API key (dsk-...). Use Dedalus REST for detection. */
export function isDedalusApiKey(key: string): boolean {
  return Boolean(key && key.startsWith('dsk-'));
}

export function isGeminiConfigured(): boolean {
  return Boolean(env.geminiApiKey && env.geminiApiKey !== 'YOUR_GEMINI_API_KEY');
}

/** Key to use for Gemini Live WebSocket (must be a Google API key). */
export function getGeminiLiveKey(): string {
  const k = env.geminiLiveApiKey;
  return isDedalusApiKey(k) ? '' : k;
}

export function isOpenClawConfigured(): boolean {
  return Boolean(
    env.openClawHost &&
      env.openClawHost !== 'http://YOUR_MAC_HOSTNAME.local' &&
      env.openClawToken &&
      env.openClawToken !== 'YOUR_OPENCLAW_GATEWAY_TOKEN'
  );
}

export function isAeroDetectConfigured(): boolean {
  return Boolean(env.aeroDetectApiUrl && env.aeroDetectApiUrl !== '');
}
