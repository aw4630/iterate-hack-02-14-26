/**
 * Aircraft component details: part specs, maintenance data, safety, suppliers.
 * Replace mock data with live API or maintenance database later.
 */

import type { ManualRef } from './knowledgeBase';

export interface ItemDetails {
  name: string;
  partNumber?: string;
  manufacturer?: string;
  specs?: { material?: string; weight?: string; serviceLife?: string; operatingLimits?: string };
  safetyInfo?: string[];
  /** Key maintenance procedures or inspection steps */
  procedures?: string[];
  compatibility?: string;
  /** Supplier pricing */
  priceAtAircraftSpruce?: number;
  priceElsewhere?: { store: string; price: number }[];
  /** Installation requirements */
  installationNotes?: string;
  /** Relevant AD or service bulletin references */
  adReferences?: Record<string, string>;
  voiceAnswer?: string;
  compatibilitySummary?: string;
  /** Manual page references from knowledge base RAG */
  manualRefs?: ManualRef[];
}

export function getMockItemDetails(label: string): ItemDetails {
  const lower = label.toLowerCase();
  if (lower.includes('spark plug')) {
    return {
      name: 'Spark Plug (Champion REM40E)',
      partNumber: 'REM40E',
      manufacturer: 'Champion Aerospace',
      specs: { material: 'Nickel alloy electrode', weight: '0.12 lbs', serviceLife: '500 hrs / annual', operatingLimits: 'Gap: 0.016–0.021 in' },
      safetyInfo: ['Ensure engine is cold before removal', 'Use calibrated torque wrench: 300–360 in-lbs'],
      procedures: ['Remove and inspect per Cessna SM Section 11', 'Check electrode wear and gap', 'Replace if fouled, cracked, or beyond limits'],
      priceAtAircraftSpruce: 24.95,
      priceElsewhere: [{ store: 'Aviall', price: 27.50 }, { store: 'SkyGeek', price: 25.99 }],
      installationNotes: 'Anti-seize compound on threads. Torque to 300–360 in-lbs. Check firing order.',
      adReferences: { 'Cessna SM 11-15': 'Spark plug inspection and replacement procedure' },
    };
  }
  if (lower.includes('oil filter')) {
    return {
      name: 'Oil Filter (Champion CH48110-1)',
      partNumber: 'CH48110-1',
      manufacturer: 'Champion Aerospace',
      specs: { material: 'Steel housing, cellulose media', weight: '0.75 lbs', serviceLife: 'Every oil change / 50 hrs', operatingLimits: 'Pressure: 100 PSI max' },
      safetyInfo: ['Drain oil before removal', 'Wear nitrile gloves — used oil is a skin irritant', 'Cut open and inspect for metal particles'],
      procedures: ['Remove per Cessna SM Section 11', 'Cut open old filter — inspect media for metal', 'Install new filter with new O-ring, hand-tight + 3/4 turn'],
      priceAtAircraftSpruce: 14.95,
      priceElsewhere: [{ store: 'Aviall', price: 16.50 }, { store: 'Chief Aircraft', price: 15.25 }],
      installationNotes: 'Lubricate O-ring with clean engine oil. Hand-tighten plus 3/4 turn. Do NOT over-torque.',
    };
  }
  // Default: generic aircraft component
  return {
    name: label,
    specs: { material: 'Varies', weight: 'See IPC', serviceLife: 'Per maintenance schedule', operatingLimits: 'See AMM' },
    safetyInfo: ['Wear appropriate PPE', 'Verify aircraft is secured and power off'],
    procedures: ['Refer to applicable Aircraft Maintenance Manual (AMM)', 'Follow manufacturer service instructions'],
    installationNotes: 'Refer to applicable maintenance manual for torque values and installation procedures.',
    adReferences: { 'Check FAA AD database': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID187124100620240716140855' },
  };
}
