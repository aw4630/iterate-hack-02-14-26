# FlightSight

![FlightSight](assets/cover.png)

A real-time AI-powered AR assistant for aircraft maintenance technicians. See what you see, hear what you say, and get instant maintenance guidance — all through voice and vision.

Built on [Meta Wearables DAT SDK](https://github.com/facebook/meta-wearables-dat-ios) + [Gemini Live API](https://ai.google.dev/gemini-api/docs/live) + [OpenClaw](https://github.com/nichochar/openclaw) (optional).

## What It Does

Put on your glasses (or point your phone camera), and talk:

- **"What am I looking at?"** — Gemini sees through your camera and identifies aircraft components (engine cowling, spark plugs, landing gear, etc.)
- **"What's the torque spec for the engine mount bolts?"** — looks up the Cessna 172 Service Manual and gives you the answer
- **"Create an inspection log entry for this oil filter change"** — delegates to OpenClaw to file paperwork
- **"Check if there's an AD on this part"** — searches Airworthiness Directives via OpenClaw

The camera streams at ~1fps to Gemini for visual context, while audio flows bidirectionally in real-time.

## How It Works

![How It Works](assets/how-it-works.png)

```
Meta Ray-Ban Glasses (or iPhone/phone camera)
       |
       | video frames + mic audio
       v
App (iOS native or Web)
       |
       | JPEG frames (~1fps) + PCM audio (16kHz)
       v
Gemini Live API (WebSocket)
       |
       |-- Audio response (PCM 24kHz) --> App --> Speaker
       |-- Tool calls (execute) -------> App --> OpenClaw Gateway
       |                                            |
       |                                            v
       |                                    Technical manual search,
       |                                    maintenance logging,
       |                                    AD/SB lookup, paperwork,
       |                                    messaging, and more
       |                                            |
       |<---- Tool response (text) <----- App <-----+
       |
       v
  Gemini speaks the result
```

**Key pieces:**
- **Gemini Live** — real-time voice + vision AI over WebSocket (native audio, not STT-first)
- **OpenClaw** (optional) — local gateway that gives Gemini access to 56+ tools and connected apps
- **iPhone mode** — test the full pipeline using your iPhone camera instead of glasses
- **Web demo** — React + TypeScript AR overlay with component detection, maintenance data, and safety guidance

## Knowledge Base

FlightSight is powered by real aviation maintenance documentation:

- **Cessna 172 Service Manual** (D2065-3-13, Rev 3, 1977–1986) — covers airframe, engine, systems, and component procedures
- **MD-11 Aircraft Maintenance Manual Chapter 75** (Air Systems) — covers pneumatic systems, air conditioning, pressurization

These documents are ingested by Gemini to provide contextual, manual-referenced responses.

## Quick Start

### Web Demo

```bash
cd web
cp .env.example .env
# Add your Gemini API key to .env
npm install
npm run dev
```

Open the browser, point your camera at aircraft components (or upload a video), and see real-time detection overlays with maintenance data.

### iOS App

```bash
cd samples/CameraAccess
open CameraAccess.xcodeproj
```

Add your Gemini API key in `GeminiConfig.swift`, build, and run on your iPhone.

### AeroDetect Server (Optional)

```bash
cd aero-detect-server
pip install -r requirements.txt
python server.py
```

Runs a local YOLOv3 detection server for aircraft component identification (requires trained weights).

## Architecture

### Web App (`web/`)

| File | Purpose |
|------|---------|
| `src/lib/detection.ts` | Component detection via AeroDetect YOLO, Dedalus, or Gemini vision |
| `src/lib/itemDetailsApi.ts` | Fetches part specs, maintenance procedures, safety data from Gemini |
| `src/lib/rag.ts` | Technician profiles: certifications, work orders, task cards |
| `src/lib/overlayRelevanceApi.ts` | Computes overlay badges: "On task card", "AD Required", "Critical" |
| `src/lib/geminiLive.ts` | WebSocket client for Gemini Live (voice + vision) |
| `src/components/HealthActionPanel.tsx` | Left panel: safety warnings, PPE, procedures, work context |
| `src/components/ItemDetailPanel.tsx` | Right panel: part number, specs, suppliers, installation notes |
| `src/components/ProfilesPanel.tsx` | Technician profile management (certifications, aircraft, task card) |

### iOS App (`samples/CameraAccess/`)

| File | Purpose |
|------|---------|
| `Gemini/GeminiConfig.swift` | API keys, model config, aviation system prompt |
| `Gemini/GeminiLiveService.swift` | WebSocket client for Gemini Live API |
| `Gemini/AudioManager.swift` | Mic capture + audio playback |
| `OpenClaw/ToolCallRouter.swift` | Routes Gemini tool calls to OpenClaw |

### Detection Server (`aero-detect-server/`)

| File | Purpose |
|------|---------|
| `server.py` | Flask server for YOLOv3 aircraft component detection |
| `classes.txt` | 25 aircraft component detection classes |

## Technician Profiles

The overlay and analysis are driven by technician profiles:

- **Certifications**: A&P Mechanic, IA Inspector, Powerplant, Airframe, Avionics, NDT
- **Work Context**: Aircraft type, tail number, work order, maintenance type
- **Task Card**: Components to inspect/service — matched components get "On task card" badges
- **Safety**: Required PPE and hazard warnings for the current job

Three preset profiles are included for demo:
1. **Mike (Cessna 172 Annual)** — Annual inspection with full A&P/IA certs
2. **Sarah (Engine Overhaul)** — Lycoming O-320 top overhaul
3. **James (AD Compliance)** — Airworthiness Directive compliance check

## Setup: OpenClaw (Optional)

OpenClaw gives Gemini the ability to search technical manuals, file maintenance logs, look up ADs, and more.

Follow the [OpenClaw setup guide](https://github.com/nichochar/openclaw) and configure your gateway. See `web/.env.example` for the required environment variables.

## Requirements

- iOS 17.0+ (for iOS app)
- Xcode 15.0+ (for iOS app)
- Node.js 18+ (for web demo)
- Gemini API key ([get one free](https://aistudio.google.com/apikey))
- Meta Ray-Ban glasses (optional — use phone/webcam mode for testing)
- OpenClaw on your Mac (optional — for agentic actions)

## License

This source code is licensed under the license found in the [LICENSE](LICENSE) file in the root directory of this source tree.
