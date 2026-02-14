/**
 * Component detection: AeroDetect YOLO, Dedalus (Gemini via Dedalus), or Google Gemini REST.
 * Identifies aircraft parts and components in camera frames.
 */

import { env, isAeroDetectConfigured, isDedalusApiKey } from './env';
import { setDedalus429 } from './dedalusRateLimit';

export interface BoundingBox {
  x: number; // top-left, normalized 0-1
  y: number;
  width: number;
  height: number;
}

export interface DetectedItem {
  label: string;
  bbox: BoundingBox;
}

/** Call AeroDetect server POST /detect with base64 image. */
async function detectWithAeroDetect(jpegBase64: string): Promise<DetectedItem[]> {
  const base = env.aeroDetectApiUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: jpegBase64 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AeroDetect error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { items?: Array<{ label: string; bbox: BoundingBox }>; error?: string };
  if (data.error) throw new Error(data.error);
  const items = data.items ?? [];
  return items.map((o) => ({ label: o.label, bbox: normalizeBbox(o.bbox) }));
}

const DETECTION_PROMPT = `You are an aircraft maintenance expert analyzing a single image of a Cessna 172 (or similar general aviation aircraft). Identify ONLY components you can clearly see and are CONFIDENT about. Be conservative — it is better to miss a component than to label something incorrectly.

RULES:
- Only label components you can positively identify with high confidence
- Use SPECIFIC Cessna 172 component names from the Service Manual: "engine cowling", "propeller blade", "propeller spinner", "main landing gear strut", "nose gear strut", "main wheel", "nose wheel", "brake assembly", "exhaust stack", "oil filter housing", "spark plug", "magneto", "carburetor", "fuel line", "fuel drain valve", "wing strut", "aileron", "wing flap", "elevator", "rudder", "trim tab", "pitot tube", "navigation light", "alternator", "battery", "air filter", "windshield", "fuel cap", "static port", "antenna", "spinner bulkhead", "oil cooler", "muffler"
- Do NOT label: sky, ground, grass, concrete, buildings, people, tools, generic "metal", "panel", "tube", "wire", "hose" without specifying what it is
- Maximum 8 components per image — focus on the most prominent and clearly visible ones
- If you see a Cessna 172 or similar aircraft, identify the aircraft type in your first label

Respond with ONLY a JSON array. Each element: { "label": "specific component name", "bbox": { "x": 0-1, "y": 0-1, "width": 0-1, "height": 0-1 } }.
Normalized coordinates: x,y = top-left corner, width/height = size. Be precise with bounding boxes — they should tightly fit the component.`;

const DEDALUS_BASE = 'https://api.dedaluslabs.ai';

/** Call Dedalus (OpenAI-compatible) with Gemini for vision. */
async function detectWithDedalus(jpegBase64: string, apiKey: string): Promise<DetectedItem[]> {
  const res = await fetch(`${DEDALUS_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: DETECTION_PROMPT },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${jpegBase64}` } },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) setDedalus429();
    throw new Error(`Dedalus error: ${res.status} ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim() ?? '[]';
  return parseDetectionJson(text);
}

function parseDetectionJson(text: string): DetectedItem[] {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [];
    return arr
      .filter(
        (o): o is { label: string; bbox: BoundingBox } =>
          o != null &&
          typeof o === 'object' &&
          typeof (o as { label?: unknown }).label === 'string' &&
          typeof (o as { bbox?: unknown }).bbox === 'object'
      )
      .map((o) => ({ label: o.label, bbox: normalizeBbox(o.bbox) }));
  } catch {
    return [];
  }
}

/** Call Google Gemini REST for bounding boxes. */
async function detectWithGemini(jpegBase64: string, apiKey: string): Promise<DetectedItem[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        parts: [
          { text: DETECTION_PROMPT },
          { inlineData: { mimeType: 'image/jpeg', data: jpegBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) {
      let retrySec = 30;
      try {
        const errJson = JSON.parse(errText) as { error?: { message?: string; details?: Array<{ retryDelay?: string }> } };
        const msg = errJson.error?.message ?? '';
        const match = msg.match(/retry in ([\d.]+)s/i) || msg.match(/(\d+)\s*second/);
        if (match) retrySec = Math.ceil(Number(match[1]));
      } catch {
        // ignore
      }
      throw new Error(`Gemini rate limit (free tier). Retry in ${retrySec}s or use AeroDetect for local detection.`);
    }
    throw new Error(`Detection API error: ${res.status} ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '[]';
  return parseDetectionJson(text);
}

/** Filter out obviously bad detections: too small, too large, or generic labels. */
function filterDetections(items: DetectedItem[]): DetectedItem[] {
  const GENERIC_LABELS = new Set(['metal', 'panel', 'tube', 'wire', 'hose', 'part', 'component', 'piece', 'object', 'thing', 'item', 'surface', 'structure', 'sky', 'ground', 'grass', 'concrete', 'building', 'person', 'tool']);
  return items.filter((item) => {
    // Reject tiny boxes (less than 2% of image in either dimension)
    if (item.bbox.width < 0.02 || item.bbox.height < 0.02) return false;
    // Reject boxes that cover almost the entire image (>95%)
    if (item.bbox.width > 0.95 && item.bbox.height > 0.95) return false;
    // Reject generic labels
    const lower = item.label.toLowerCase().trim();
    if (GENERIC_LABELS.has(lower)) return false;
    if (lower.length < 3) return false;
    return true;
  });
}

export async function detectItemsInImage(
  jpegBase64: string,
  apiKey: string
): Promise<DetectedItem[]> {
  let items: DetectedItem[];
  if (isAeroDetectConfigured()) {
    items = await detectWithAeroDetect(jpegBase64);
  } else if (isDedalusApiKey(apiKey)) {
    items = await detectWithDedalus(jpegBase64, apiKey);
  } else {
    items = await detectWithGemini(jpegBase64, apiKey);
  }
  return filterDetections(items);
}

function normalizeBbox(b: { x?: number; y?: number; width?: number; height?: number }): BoundingBox {
  return {
    x: Math.max(0, Math.min(1, Number(b.x) ?? 0)),
    y: Math.max(0, Math.min(1, Number(b.y) ?? 0)),
    width: Math.max(0.01, Math.min(1, Number(b.width) ?? 0.1)),
    height: Math.max(0.01, Math.min(1, Number(b.height) ?? 0.1)),
  };
}
