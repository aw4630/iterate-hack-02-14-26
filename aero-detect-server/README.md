# AeroDetect – Aircraft Component Detection Server

YOLOv3 (Darknet) detection server for identifying aircraft parts and components. The FlightSight web app sends camera frames here and draws the returned bounding boxes in real time.

## Setup

### 1. Get model config and weights

You need a trained YOLOv3 model for aircraft component detection:

- Model config: `AeroDetect/darknet_configs/yolov3_custom_test.cfg`
- Weights: `AeroDetect/backup/aero-detect_final.weights`

Place the `AeroDetect/` directory alongside this server, or set `AERO_DETECT_DIR` to point to it.

### 2. Install and run

```bash
cd aero-detect-server
pip install -r requirements.txt
python server.py
```

Server runs at **http://localhost:5000** by default. Check **http://localhost:5000/health** to see if the model loaded.

### 3. Point the web app at the server

In `web/.env` add:

```env
VITE_AERODETECT_API_URL=http://localhost:5000
```

Restart `npm run dev`. The app will use AeroDetect for component detection instead of Gemini vision.

## Configuration

- **Class names:** Edit `classes.txt` (one label per line, order must match the model).
- **Confidence:** Set `CONFIDENCE_THRESH=0.5` (default 0.4) to reduce false positives.
- **Model path:** Set `AERO_DETECT_DIR` to the path of your model directory if it's not at `../AeroDetect`.
