import React from 'react';
import type { ItemDetails } from '../lib/itemDetails';
import type { PersonProfile } from '../lib/rag';

const glassStyle: React.CSSProperties = {
  background: 'rgba(18, 20, 24, 0.82)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 16,
  color: '#e8e8e8',
};

interface HealthActionPanelProps {
  /** Selected component details (when user clicked or auto-selected) */
  itemDetails: ItemDetails | null;
  /** Current technician profile for context-aware guidance */
  currentProfile: PersonProfile | null;
}

/** Component name lower for matching. */
function componentMatch(name: string, ...keywords: string[]): boolean {
  const n = name.toLowerCase();
  return keywords.some((k) => n.includes(k));
}

/** Categorize aircraft component for context-aware guidance. */
function getComponentCategory(name: string): 'engine' | 'airframe' | 'landing_gear' | 'avionics' | 'fuel_system' | 'control_surface' | 'electrical' | 'other' {
  const n = name.toLowerCase();
  if (n.match(/engine|cowling|cylinder|piston|crankshaft|camshaft|magneto|carburetor|spark plug|oil filter|exhaust|propeller|alternator/)) return 'engine';
  if (n.match(/wing|fuselage|strut|skin|rivet|spar|rib|bulkhead|firewall/)) return 'airframe';
  if (n.match(/landing gear|wheel|brake|tire|strut|oleo|nose wheel|main wheel/)) return 'landing_gear';
  if (n.match(/avionics|radio|transponder|nav|gps|instrument|altimeter|airspeed|gyro|attitude/)) return 'avionics';
  if (n.match(/fuel|tank|fuel line|fuel valve|drain|gascolator|selector/)) return 'fuel_system';
  if (n.match(/aileron|elevator|rudder|flap|trim|control|cable|pushrod|bellcrank/)) return 'control_surface';
  if (n.match(/battery|wire|bus|fuse|breaker|light|beacon|strobe|navigation light/)) return 'electrical';
  return 'other';
}

/** Generate actionable maintenance guidance based on component and technician context. */
function getActionableBullets(details: ItemDetails, profile: PersonProfile | null): string[] {
  const bullets: string[] = [];
  const { name, safetyInfo, procedures, specs } = details;
  const wc = profile?.workContext;
  const certifications = profile?.certifications ?? [];
  const safetyReqs = profile?.safetyRequirements ?? [];
  const category = getComponentCategory(name ?? '');

  // —— 1. Safety warnings (always first) ——
  if (safetyInfo && safetyInfo.length > 0) {
    for (const warning of safetyInfo.slice(0, 3)) {
      bullets.push(`⚠ ${warning}`);
    }
  }

  // —— 2. PPE requirements from profile ——
  if (safetyReqs.length > 0) {
    const required = safetyReqs.filter((s) => s.severity === 'required');
    if (required.length > 0) {
      bullets.push(`PPE Required: ${required.map((s) => s.item).join(', ')}`);
    }
  }

  // —— 3. Component-specific guidance ——
  if (category === 'engine') {
    if (componentMatch(name!, 'spark plug')) {
      bullets.push('Inspect electrode wear and gap (0.016–0.021 in). Replace if fouled, cracked, or beyond limits.');
      bullets.push('Torque to 300–360 in-lbs with anti-seize on threads. Reference: Cessna SM Section 11.');
    } else if (componentMatch(name!, 'oil filter')) {
      bullets.push('Cut open and inspect filter media for metal particles — indicates internal engine wear.');
      bullets.push('Install new O-ring with clean oil. Hand-tight + 3/4 turn. Do NOT over-torque.');
    } else if (componentMatch(name!, 'magneto')) {
      bullets.push('Check timing with timing light. Internal timing: refer to Slick or Bendix overhaul manual.');
      bullets.push('500-hr inspection interval. Check impulse coupling operation.');
    } else if (componentMatch(name!, 'propeller')) {
      bullets.push('Inspect for nicks, cracks, and erosion. Dress minor nicks per manufacturer limits.');
      bullets.push('Check blade track and hub bolt torque. Reference: propeller manufacturer maintenance manual.');
    } else {
      bullets.push('Follow engine manufacturer overhaul/inspection procedures. Check applicable Service Bulletins.');
    }
  }

  if (category === 'landing_gear') {
    if (componentMatch(name!, 'brake')) {
      bullets.push('Inspect brake pads for minimum thickness. Check disc for scoring or heat damage.');
      bullets.push('Bleed brakes if spongy. Use MIL-PRF-83282 hydraulic fluid (or as specified).');
    } else if (componentMatch(name!, 'tire', 'wheel')) {
      bullets.push('Check tire pressure and tread depth. Inspect for cuts, bulges, or flat spots.');
      bullets.push('Check wheel bearings for play and condition during tire changes.');
    } else {
      bullets.push('Inspect strut for proper inflation (check service manual for oleo extension specs).');
      bullets.push('Check all gear attach bolts for proper torque and safety wire.');
    }
  }

  if (category === 'control_surface') {
    bullets.push('Check for free and correct movement through full range. Verify cable tension per rigging chart.');
    bullets.push('Inspect hinges, bellcranks, and rod ends for wear and play. Safety wire all castle nuts.');
    if (componentMatch(name!, 'trim')) {
      bullets.push('Verify trim tab travel limits per service manual. Check actuator and jackscrew for wear.');
    }
  }

  if (category === 'fuel_system') {
    bullets.push('⚠ Fire hazard: ensure no ignition sources nearby. Have fire extinguisher accessible.');
    bullets.push('⚠ Chemical-resistant gloves required for fuel system work.');
    bullets.push('Check all fittings for leaks. Drain and check fuel for water/contamination.');
  }

  if (category === 'avionics') {
    bullets.push('Ensure master switch OFF before working on avionics. Use ESD precautions.');
    bullets.push('Check antenna connections and coax for damage. Verify proper operation after maintenance.');
  }

  if (category === 'electrical') {
    bullets.push('Disconnect battery before electrical work. Verify polarity before reconnection.');
    if (componentMatch(name!, 'battery')) {
      bullets.push('Check electrolyte level and specific gravity (if applicable). Clean terminals and apply anti-corrosion compound.');
    }
  }

  // —— 4. Procedures from API if available ——
  if (procedures && procedures.length > 0 && bullets.length < 6) {
    for (const proc of procedures.slice(0, 2)) {
      if (!bullets.some((b) => b.includes(proc))) {
        bullets.push(proc);
      }
    }
  }

  // —— 5. Work context notes ——
  if (wc?.workNotes) {
    bullets.push(`Work order note: ${wc.workNotes.slice(0, 120)}`);
  }

  // —— 6. Certification reminder ——
  if (wc?.maintenanceType?.includes('inspection') && !certifications.includes('ia_inspector')) {
    bullets.push('Note: IA (Inspection Authorization) required to sign off annual/100-hr inspections.');
  }

  return bullets;
}

export function HealthActionPanel({ itemDetails, currentProfile }: HealthActionPanelProps) {
  if (!currentProfile) return null;

  const wc = currentProfile.workContext;
  const hasWorkContext = wc && (wc.aircraftType || wc.workOrderNumber || wc.maintenanceType?.length || wc.workNotes);

  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 260,
        maxWidth: 'calc(100vw - 32px)',
        ...glassStyle,
        padding: 16,
        zIndex: 12,
        maxHeight: '80vh',
        overflow: 'auto',
      }}
    >
      <div style={{ fontSize: 11, color: '#00ff88', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        Maintenance &amp; Safety
      </div>

      {itemDetails ? (
        <>
          <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, marginBottom: 8 }}>Maintenance Guidance</div>
          <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
            Safety warnings, procedures, and work context for this component.
          </p>
          {(() => {
            const bullets = getActionableBullets(itemDetails, currentProfile);
            return bullets.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#ccc', lineHeight: 1.5 }}>
                {bullets.map((b, i) => (
                  <li key={i} style={{ marginBottom: 6, color: b.startsWith('⚠') ? '#ffaa00' : '#ccc' }}>
                    {b}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 12, color: '#888' }}>Select a component or wait for details to see maintenance guidance.</p>
            );
          })()}
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, marginBottom: 6 }}>Work Context</div>
          {hasWorkContext ? (
            <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.45 }}>
              {wc!.aircraftType ? (
                <p style={{ margin: '0 0 6px 0' }}><strong style={{ color: '#00ff88' }}>Aircraft:</strong> {wc!.aircraftType}{wc!.aircraftTailNumber ? ` (${wc!.aircraftTailNumber})` : ''}</p>
              ) : null}
              {wc!.workOrderNumber ? (
                <p style={{ margin: '0 0 6px 0' }}><strong style={{ color: '#00ff88' }}>Work Order:</strong> {wc!.workOrderNumber}</p>
              ) : null}
              {wc!.maintenanceType?.length ? (
                <p style={{ margin: '0 0 6px 0' }}><strong style={{ color: '#00ff88' }}>Type:</strong> {wc!.maintenanceType.join(', ')}</p>
              ) : null}
              {wc!.workNotes ? (
                <p style={{ margin: 0 }}><strong style={{ color: '#00ff88' }}>Notes:</strong> {wc!.workNotes}</p>
              ) : null}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: '#666' }}>
              Set up a technician profile with aircraft type, work order, and task card to get context-aware maintenance guidance.
            </p>
          )}
        </>
      )}
    </div>
  );
}
