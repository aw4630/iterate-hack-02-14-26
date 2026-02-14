# FlightSight – Web App

Browser app: **full-screen camera** + **Gemini Live** (voice + vision) + **aircraft component detection/boxes** + **focused component details** (specs, safety, procedures, supplier pricing). Uses the same Gemini Live + OpenClaw flow as the FlightSight iOS app.

## Quick start

```bash
cd web
cp .env.example .env
# Edit .env: set VITE_GEMINI_API_KEY (Gemini or Dedalus key)
npm install
npm run dev
```

Open the URL (e.g. `http://localhost:5173`), click **Start camera** and choose your camera, then point at aircraft components for real-time detection and maintenance overlays.

See **[SETUP_AND_REQUIREMENTS.md](../SETUP_AND_REQUIREMENTS.md)** in the repo root for full setup details.

## Deploy to Vercel

1. Push your repo to GitHub.
2. Go to [vercel.com](https://vercel.com), import the repo.
3. **Root Directory:** Set to `web`.
4. **Environment variables:** Add `VITE_GEMINI_API_KEY` (required). Optionally: `VITE_GEMINI_LIVE_API_KEY`, `VITE_AERODETECT_API_URL`, `VITE_OPENCLAW_*`.
5. Click **Deploy**.
