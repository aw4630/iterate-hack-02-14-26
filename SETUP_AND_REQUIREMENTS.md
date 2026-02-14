# FlightSight – What You Need & How to Run

This doc lists **exactly** what you need to provide and how to run the web app (camera + Gemini Live + aircraft component detection + maintenance overlays).

---

## 1. What You Need

### Required

- **Gemini API key** (or Dedalus key)
  - Get one: https://aistudio.google.com/apikey (free) or use a Dedalus key (dsk-...).
  - Put it in `web/.env` as `VITE_GEMINI_API_KEY=your_key_here`.

### Optional (for full agent behavior)

- **OpenClaw** (for tool-calling: search manuals, file reports, etc.):
  - Run OpenClaw on your Mac and enable the gateway (see main [README](README.md)).
  - In `web/.env` set:
    - `VITE_OPENCLAW_HOST=http://Your-Mac.local`
    - `VITE_OPENCLAW_PORT=18789`
    - `VITE_OPENCLAW_GATEWAY_TOKEN=your_gateway_token`

### Camera

- Use your laptop's built-in webcam, or install **Camo** on your iPhone + laptop for a mobile camera feed.
- You can also upload a video of an aircraft engine/exterior in **AR Glasses** mode.

### Optional: AeroDetect (YOLO component detection)

- For local aircraft component detection, run the AeroDetect server:
  1. Get trained model weights
  2. Run the server: `cd aero-detect-server && pip install -r requirements.txt && python server.py`
  3. In `web/.env` add: `VITE_AERODETECT_API_URL=http://localhost:5000`
- When set, the web app uses AeroDetect for detection instead of Gemini vision.

---

## 2. How to Run the Web App

```bash
cd web
cp .env.example .env
# Edit .env: set VITE_GEMINI_API_KEY (and optionally OpenClaw vars).
npm install
npm run dev
```

- Open the URL shown (e.g. `http://localhost:5173`).
- Click **Start camera** and select your camera.
- Point at aircraft components — they'll be detected and boxed in real-time.
- Click any component box to see detailed specs, maintenance procedures, safety warnings, and supplier pricing.
- Use **AR Glasses** mode to upload a video of an aircraft for analysis.

---

## 3. What's Implemented

| Feature | Status |
|--------|--------|
| Full-screen camera (any device) | Done |
| Gemini Live (video + audio, voice in/out) | Done |
| Aircraft component detection (boxes) | Done (Gemini REST or AeroDetect YOLO) |
| Overlay: boxes + "tap to inspect" list | Done |
| Component detail panel (specs, safety, procedures, suppliers) | Done |
| Technician profiles (certifications, work orders, task cards) | Done |
| Maintenance & Safety panel (PPE, procedures, work context) | Done |
| Overlay badges ("On task card", "AD Required", "Critical") | Done |
| OpenClaw "execute" (search manuals, file reports, etc.) | Done when env is set |
| Voice Q&A about components | Done |

---

## 4. API Keys and Secrets

- **Never** commit `.env` or put your real API key in the repo. `.env` is gitignored.
- For production, use **ephemeral tokens** for Gemini instead of the API key in the browser.

---

## 5. Troubleshooting

- **"Add VITE_GEMINI_API_KEY"**: Create `web/.env` from `web/.env.example` and set `VITE_GEMINI_API_KEY`.
- **No camera list**: Allow camera permission for the site; choose the correct device.
- **OpenClaw connection timeout**: Ensure the browser can reach the Mac, gateway is running, and tokens match.
- **Boxes don't match components**: Gemini detection runs every ~2–10s depending on API. For faster detection, use AeroDetect locally.
