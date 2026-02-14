# FlightSight

**AR-powered aircraft maintenance assistant with real-time component detection, voice interaction, and service manual integration.**

Point your camera (phone, webcam, or AR glasses) at an aircraft — FlightSight identifies components in real time, overlays maintenance data with clickable Cessna 172 Service Manual page references, and answers your questions by voice.

![Tech Stack](assets/tech-stack.png)

## What It Does

- **Real-time component detection** — Gemini 2.0 Flash analyzes camera frames and draws bounding boxes around aircraft parts (engine cowling, propeller, pitot tube, landing gear, etc.)
- **Service Manual RAG** — Each detected component is matched against a knowledge base extracted from the Cessna 172 Service Manual (D2065-3-13) and the Lycoming O-320 Operator's Manual (60297-22). Overlays show manual page numbers and figure references (e.g. "Cessna SM p.377, Fig 15-2" or "O-320 OM p.34"). Click to open the actual PDF page.
- **Voice Q&A** — Ask questions hands-free via Web Speech API. Answers are grounded in real manual data with page citations. Text-to-speech output via ElevenLabs.
- **Technician profiles** — Certifications, work orders, and task cards drive contextual overlays ("On task card", "AD Required", "PPE required").
- **AR Glasses support** — Upload walkthrough video or stream from Meta Ray-Ban glasses for the same detection + overlay pipeline.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Vision / Detection** | Google Gemini 2.0 Flash (via Dedalus API) |
| **Voice Input** | Web Speech API |
| **Voice Output** | ElevenLabs API |
| **Knowledge Base** | Cessna 172 Service Manual + Lycoming O-320 Operator's Manual + RAG JSON index |
| **Frontend** | React, TypeScript, Vite |
| **Local Detection** | Python/Flask + YOLOv3 (AeroDetect, optional) |
| **Agent Gateway** | OpenClaw (future — for agentic tool-calling, paperwork, AD lookup) |

## How It Works

```
AR Glasses / Phone Camera
       |
       |— video frames ——> Gemini 2.0 Flash ——> Bounding boxes + labels
       |                                              |
       |                                    RAG Knowledge Base (JSON)
       |                                    matches components to manual
       |                                    pages, figures, procedures
       |                                              |
       |                                              v
       |                                    React + TypeScript + Vite
       |                                    AR overlay with boxes,
       |                                    manual ref badges,
       |                                    item detail panel,
       |                                    clickable PDF page links
       |
       |— voice audio ——> Web Speech API ——> Gemini 2.0 Flash (+ RAG context)
                                                      |
                                                      v
                                              ElevenLabs API ——> Audio playback
```

**Detection flow:** Camera frame (every ~4s) → Gemini vision API → JSON array of components with bounding boxes → local KB lookup for manual page refs → overlay canvas renders boxes with blue "SM p.XXX" badges → tap component → detail panel with specs, safety, procedures, supplier pricing, and clickable PDF links.

**Voice flow:** Technician speaks → Web Speech API transcribes → query + RAG context sent to Gemini → answer with manual page citations → ElevenLabs converts to speech → audio plays back.

## Knowledge Base

FlightSight is grounded in real aviation maintenance documentation:

- **Cessna 172 Service Manual** (D2065-3-13, Rev 3, 1977–1986) — 639 pages covering airframe, engine, landing gear, fuel system, instruments, electrical, and structural repair
- **Lycoming O-320 Operator's Manual** (60297-22, 2nd Edition, 2007) — 68 pages covering engine description, specifications, operating instructions (starting, ground check, leaning, carb heat), periodic inspections (daily pre-flight, 50/100/400-hr), maintenance procedures (magneto timing, cylinder work, hydraulic tappets), and troubleshooting
- **MD-11 Aircraft Maintenance Manual Chapter 75** (Air Systems)

The manuals are pre-processed into `cessna172-kb.json` — 70+ indexed chunks across both the Cessna SM and O-320 OM, with section numbers, page numbers, figure references, and searchable keywords. At runtime, detected component names are matched against this index to inject real manual content into AI prompts and display clickable page links in the UI. The system intelligently routes engine-specific queries to the O-320 OM and airframe queries to the Cessna SM.

## Quick Start

```bash
cd web
cp .env.example .env
# Set VITE_GEMINI_API_KEY (Dedalus or Google Gemini key)
# Set VITE_ELEVENLABS_API_KEY for voice output
npm install
npm run dev
```

Open the browser, point your camera at aircraft components (or switch to AR Glasses mode and upload a Cessna 172 video), and see real-time detection overlays with manual references.

## Architecture

### Web App (`web/`)

| File | Purpose |
|------|---------|
| `src/lib/detection.ts` | Component detection via Gemini vision (conservative: max 8 components, bbox filtering) |
| `src/lib/knowledgeBase.ts` | RAG module: loads cessna172-kb.json, keyword search, returns manual page refs |
| `src/lib/itemDetailsApi.ts` | Fetches part specs + procedures from Gemini, enriched with RAG context |
| `src/lib/voiceQuestion.ts` | Voice Q&A: RAG lookup + Gemini answer + ElevenLabs TTS |
| `src/lib/elevenlabs.ts` | ElevenLabs text-to-speech integration |
| `src/lib/geminiLive.ts` | WebSocket client for Gemini Live (real-time voice + vision) |
| `src/lib/rag.ts` | Technician profiles: certifications, work orders, task cards |
| `src/lib/overlayRelevance.ts` | Overlay badges with manual page refs ("SM p.377, Fig 15-2") |
| `src/components/ItemDetailPanel.tsx` | Detail panel: specs, safety, procedures, clickable PDF page links |
| `src/components/OverlayCanvas.tsx` | AR overlay: bounding boxes + labels + blue manual ref badges |
| `src/components/HealthActionPanel.tsx` | Safety warnings, PPE requirements, work context |
| `src/components/ProfilesPanel.tsx` | Technician profile management |

### Knowledge Base (`web/public/`)

| File | Purpose |
|------|---------|
| `cessna172-kb.json` | 70+ chunks from Cessna 172 SM + O-320 OM with page numbers, figures, keywords |
| `manuals/cessna172-sm.pdf` | Full Cessna 172 Service Manual (639 pages, served for clickable links) |
| `manuals/o320-operators-manual.pdf` | Lycoming O-320 Operator's Manual (68 pages, engine-specific procedures) |
| `manuals/md11-ch75.pdf` | MD-11 AMM Chapter 75 |

### iOS App (`samples/CameraAccess/`)

| File | Purpose |
|------|---------|
| `Gemini/GeminiConfig.swift` | API keys, model config, aviation system prompt |
| `Gemini/GeminiLiveService.swift` | WebSocket client for Gemini Live API |

## Technician Profiles

Overlays and AI responses are driven by technician profiles:

- **Certifications**: A&P Mechanic, IA Inspector, Powerplant, Airframe, Avionics, NDT
- **Work Context**: Aircraft type, tail number, work order, maintenance type
- **Task Card**: Components to inspect — matched components get "On task card" badges
- **Safety**: Required PPE and hazard warnings

Three presets included for demo:
1. **Mike** — Cessna 172 Annual Inspection (A&P/IA)
2. **Sarah** — Lycoming O-320 Engine Overhaul
3. **James** — Airworthiness Directive Compliance Check

## Future: OpenClaw Agent Integration

OpenClaw is planned for agentic capabilities — not currently active in the demo. When integrated, it will give Gemini the ability to:
- Search technical manuals and AD databases
- File maintenance log entries and inspection reports
- Send messages to supervisors
- Interact with maintenance management systems

## Requirements

- Node.js 18+ (web demo)
- Gemini API key or Dedalus API key
- ElevenLabs API key (for voice output)
- iOS 17.0+ / Xcode 15.0+ (for iOS app, optional)
- Meta Ray-Ban glasses (optional — phone/webcam works for demo)
