# FlightSight — AR-Powered Aircraft Maintenance Assistant

## Problem

Aviation maintenance is a field where there is no room for error — every bolt tightened, every part inspected carries the weight of hundreds of lives on every flight. Due to the high-stakes nature of aviation maintenance, stringent practices must be followed. These practices are enforced at the federal level by the FAA through Airworthiness Directives (ADs), Advisory Circulars (ACs), and manufacturer Service Bulletins (SBs).

Despite the critical nature of this work, technicians still rely on paper manuals, separate laptops for documentation, and memory for procedure steps. This leads to inefficiency, increased error potential, and slower turnaround times.

## Solution

**FlightSight** is an AR-powered maintenance assistant that uses Meta Ray-Ban smart glasses (or a phone camera) with real-time AI vision to help aviation maintenance technicians work faster and safer.

### Core Features

#### 1. Component Recognition & Identification (Vision)
- Point the camera at any aircraft part or component → the system identifies what you're looking at
- Displays the part name, part number, and relevant maintenance data as an AR overlay
- Knowledge base sourced from real maintenance manuals (Cessna 172 Service Manual, MD-11 AMM Chapter 75)

#### 2. Maintenance Procedure Guidance
- Show your assigned work ticket/task card → the system identifies the maintenance procedures you need to follow
- Displays step-by-step instructions, required references (AMM, SRM, IPC sections), projected manpower, and estimated time
- Highlights critical safety steps and required inspections

#### 3. Exploded View & Component Locator
- When working on a task, displays exploded/cutaway views of the component assembly you're looking at
- Helps technicians locate specific parts on the actual aircraft that manuals don't always clearly illustrate
- Cross-references Illustrated Parts Catalogs (IPC) for part identification

#### 4. Fault Detection & Inspection Assistance
- Identifies visible faults: corrosion, cracks, wear, leaks, missing hardware
- Flags discrepancies against maintenance standards
- Suggests appropriate repair procedures from the Structural Repair Manual (SRM)

#### 5. AR Overlay Data
- Overlays on recognized components show: part number, service life, last inspection date, next due, AD compliance status
- Badges: "AD Required", "Critical", "Due for Inspection", "Compatible", "On Task Card"
- Color-coded by criticality (red = critical/overdue, yellow = approaching, green = compliant)

#### 6. Agent / Paperwork Automation (OpenClaw)
- Voice command: "Complete the 8610-2 for this repair" → OpenClaw fills in all relevant fields
- Auto-populates maintenance logbook entries, inspection sign-offs, and work order updates
- Searches technical publications by voice: "What's the torque spec for the engine mount bolts?"

#### 7. PPE & Safety Compliance
- Maintenance procedures include hazard warnings — the system surfaces required PPE before you begin
- Alerts for: hearing protection near running engines, eye protection for grinding, chemical-resistant gloves for fuel system work
- Compliance tracking: ensures proper attire before signing off on procedures

## Tech Stack

- **Vision**: Meta Ray-Ban smart glasses camera / iPhone camera → Gemini Live API (real-time vision + voice)
- **Detection**: Custom YOLO model for aircraft component detection + Gemini vision for general identification
- **Knowledge Base**: Cessna 172 Service Manual (1977-1986), MD-11 AMM Chapter 75 (Air Systems) — ingested by Gemini for contextual responses
- **Agent**: OpenClaw gateway for tool-calling (paperwork, searches, logbook entries)
- **Web Demo**: React + TypeScript + Vite — real-time camera overlay with hardcoded demo data
- **iOS App**: Swift — Meta DAT SDK integration for glasses streaming

## Demo Plan

For the hackathon demo, we use:
- **Image + video** of an airplane engine/exterior as the camera feed
- **Hardcoded detection data** (dataless — no live model required)
- **Real maintenance manual content** from the Cessna 172 SM and MD-11 AMM as the knowledge base
- **Gemini** processes the visual feed and returns contextual maintenance information
- **OpenClaw** handles voice-commanded paperwork and technical searches
