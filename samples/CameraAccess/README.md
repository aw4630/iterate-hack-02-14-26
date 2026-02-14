# FlightSight – iOS App

A real-time AI assistant for aircraft maintenance technicians using Meta Ray-Ban smart glasses. See what you see, hear what you say, and get instant maintenance guidance — all through voice.

Built on [Meta Wearables DAT SDK](https://github.com/facebook/meta-wearables-dat-ios) + [Gemini Live API](https://ai.google.dev/gemini-api/docs/live) + [OpenClaw](https://github.com/nichochar/openclaw) (optional).

## What It Does

Put on your glasses, tap the AI button, and talk:

- **"What am I looking at?"** — Gemini sees through your glasses camera and identifies aircraft components
- **"What's the torque spec for the engine mount bolts?"** — looks up the maintenance manual
- **"Create an inspection log entry"** — delegates to OpenClaw to file paperwork
- **"Check if there's an AD on this part"** — searches Airworthiness Directives

The glasses camera streams at ~1fps to Gemini for visual context, while audio flows bidirectionally in real-time.

## Quick Start

### 1. Open the project

```bash
cd samples/CameraAccess
open CameraAccess.xcodeproj
```

### 2. Add your Gemini API key

Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey).

Open `CameraAccess/Gemini/GeminiConfig.swift` and replace the placeholder:

```swift
static let apiKey = "YOUR_GEMINI_API_KEY"  // <-- paste your key here
```

### 3. Build and run

Select your iPhone as the target device and hit Run (Cmd+R).

### 4. Try it out

**Without glasses (iPhone mode):**
1. Tap **"Start on iPhone"** — uses your iPhone's back camera
2. Tap the **AI button** to start a Gemini Live session
3. Talk to the AI — it can see through your iPhone camera and identify aircraft components

**With Meta Ray-Ban glasses:**
1. Pair your glasses via the Meta AI app (enable Developer Mode)
2. Tap **"Start Streaming"** in the app
3. Tap the **AI button** for voice + vision conversation

## Architecture

### Key Files

| File | Purpose |
|------|---------|
| `Gemini/GeminiConfig.swift` | API keys, model config, aviation system prompt |
| `Gemini/GeminiLiveService.swift` | WebSocket client for Gemini Live API |
| `Gemini/AudioManager.swift` | Mic capture (PCM 16kHz) + audio playback (PCM 24kHz) |
| `Gemini/GeminiSessionViewModel.swift` | Session lifecycle, tool call wiring, transcript state |
| `OpenClaw/ToolCallModels.swift` | Tool declarations, data types |
| `OpenClaw/OpenClawBridge.swift` | HTTP client for OpenClaw gateway |
| `OpenClaw/ToolCallRouter.swift` | Routes Gemini tool calls to OpenClaw |
| `iPhone/IPhoneCameraManager.swift` | AVCaptureSession wrapper for iPhone camera mode |

## Requirements

- iOS 17.0+
- Xcode 15.0+
- Gemini API key ([get one free](https://aistudio.google.com/apikey))
- Meta Ray-Ban glasses (optional — use iPhone mode for testing)
- OpenClaw on your Mac (optional — for agentic actions)

## License

This source code is licensed under the license found in the [LICENSE](../../LICENSE) file in the root directory of this source tree.
