/**
 * RAG (Retrieval-Augmented Context) for FlightSight: technician profiles, certifications, work orders.
 * Each technician profile drives overlay emphasis and Gemini analysis.
 */

export type Certification =
  | 'ap_mechanic'
  | 'ia_inspector'
  | 'powerplant'
  | 'airframe'
  | 'avionics'
  | 'ndt_certified'
  | 'rts_authority'
  | 'welding_certified';

export interface SafetyRequirement {
  item: string;
  severity?: 'required' | 'recommended' | 'optional';
  notes?: string;
}

/** Work context for actionable, task-driven recommendations. */
export interface WorkContext {
  /** Current aircraft tail number or fleet designation */
  aircraftTailNumber?: string;
  /** Aircraft type (e.g. "Cessna 172", "MD-11") */
  aircraftType?: string;
  /** Current work order / task card number */
  workOrderNumber?: string;
  /** Type of maintenance: "scheduled", "unscheduled", "inspection", "AD compliance", "modification" */
  maintenanceType?: string[];
  /** Free text: special notes from supervisor, squawk description, etc. */
  workNotes?: string;
}

export interface PersonProfile {
  id: string;
  name: string;
  certifications: Certification[];
  experienceLevel: boolean; // true = senior/lead
  safetyRequirements: SafetyRequirement[];
  taskCardItems: string[];
  notes?: string;
  /** Work context: aircraft, work order, maintenance type */
  workContext?: WorkContext;
}

export const PRESET_CESSNA_ANNUAL: PersonProfile = {
  id: 'preset-cessna-annual',
  name: 'Mike (Cessna 172 Annual)',
  certifications: ['ap_mechanic', 'ia_inspector', 'powerplant', 'airframe'],
  experienceLevel: true,
  safetyRequirements: [
    { item: 'Safety glasses', severity: 'required' },
    { item: 'Hearing protection', severity: 'recommended', notes: 'Engine run-up' },
  ],
  taskCardItems: ['engine oil change', 'spark plug inspection', 'magneto timing check', 'brake pad inspection', 'oil filter replacement', 'compression test'],
  notes: 'Annual inspection on Cessna 172N, N12345. Reference: Cessna 172 Service Manual D2065-3-13.',
  workContext: {
    aircraftTailNumber: 'N12345',
    aircraftType: 'Cessna 172N',
    workOrderNumber: 'WO-2026-0214',
    maintenanceType: ['scheduled', 'inspection'],
    workNotes: 'Annual inspection. Check AD 2024-15-06 compliance (engine mount bolts torque).',
  },
};

export const PRESET_ENGINE_OVERHAUL: PersonProfile = {
  id: 'preset-engine-overhaul',
  name: 'Sarah (Engine Overhaul)',
  certifications: ['ap_mechanic', 'powerplant'],
  experienceLevel: false,
  safetyRequirements: [
    { item: 'Safety glasses', severity: 'required' },
    { item: 'Chemical-resistant gloves', severity: 'required', notes: 'Fuel system work' },
    { item: 'Fire extinguisher nearby', severity: 'required' },
  ],
  taskCardItems: ['cylinder removal', 'piston inspection', 'crankshaft inspection', 'camshaft inspection', 'oil pump check', 'accessory case inspection'],
  notes: 'Lycoming O-320 top overhaul at TBO. Reference maintenance manual and Lycoming SI-1009.',
  workContext: {
    aircraftType: 'Cessna 172',
    maintenanceType: ['unscheduled'],
    workNotes: 'Top overhaul at 2000 hrs TBO. Cylinder #3 low compression reported.',
  },
};

export const PRESET_AD_COMPLIANCE: PersonProfile = {
  id: 'preset-ad-compliance',
  name: 'James (AD Compliance)',
  certifications: ['ap_mechanic', 'ia_inspector', 'airframe'],
  experienceLevel: true,
  safetyRequirements: [
    { item: 'Safety glasses', severity: 'required' },
    { item: 'Torque wrench calibrated', severity: 'required' },
  ],
  taskCardItems: ['engine mount bolt inspection', 'torque verification', 'control surface inspection', 'trailing edge crack check'],
  notes: 'AD compliance check. Reference: AD 2024-15-06 (engine mount bolts), Cessna SM TR5 (trailing edge cracks).',
  workContext: {
    aircraftTailNumber: 'N67890',
    aircraftType: 'Cessna 172P',
    workOrderNumber: 'WO-2026-0215',
    maintenanceType: ['AD compliance', 'inspection'],
    workNotes: 'Biennial AD compliance review. Verify engine mount bolt torque values per TR4.',
  },
};

export const PRESET_PROFILES: PersonProfile[] = [
  PRESET_CESSNA_ANNUAL,
  PRESET_ENGINE_OVERHAUL,
  PRESET_AD_COMPLIANCE,
];

const STORAGE_KEY = 'flightsight_profiles';

export function loadCustomProfiles(): PersonProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersonProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomProfiles(profiles: PersonProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // ignore
  }
}

/** Check if label is on task card (fuzzy: lowercase, includes). */
export function isOnTaskCard(label: string, profile: PersonProfile): boolean {
  const lower = label.toLowerCase();
  return profile.taskCardItems.some((item) => lower.includes(item.toLowerCase()) || item.toLowerCase().includes(lower));
}

/** One-line summary of profile for prompts. */
export function profileSummary(profile: PersonProfile): string {
  const parts: string[] = [];
  if (profile.certifications.length > 0) {
    parts.push(`Certifications: ${profile.certifications.join(', ')}.`);
  }
  if (profile.experienceLevel) {
    parts.push('Senior technician / lead mechanic.');
  }
  if (profile.safetyRequirements.length > 0) {
    parts.push(
      `Safety requirements: ${profile.safetyRequirements.map((s) => s.item + (s.notes ? ` (${s.notes})` : '')).join(', ')}.`
    );
  }
  const wc = profile.workContext;
  if (wc?.aircraftType) {
    parts.push(`Aircraft: ${wc.aircraftType}${wc.aircraftTailNumber ? ` (${wc.aircraftTailNumber})` : ''}.`);
  }
  if (wc?.maintenanceType?.length) {
    parts.push(`Maintenance type: ${wc.maintenanceType.join(', ')}.`);
  }
  if (wc?.workNotes) parts.push(wc.workNotes);
  if (profile.taskCardItems.length > 0) {
    parts.push(`Task card items: ${profile.taskCardItems.slice(0, 12).join(', ')}${profile.taskCardItems.length > 12 ? '...' : ''}.`);
  }
  if (profile.notes) parts.push(profile.notes);
  return parts.join(' ');
}
