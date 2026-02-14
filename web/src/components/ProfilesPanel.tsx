import React, { useState } from 'react';
import type { PersonProfile } from '../lib/rag';
import { PRESET_PROFILES, loadCustomProfiles, saveCustomProfiles, type Certification } from '../lib/rag';

const CERTIFICATION_OPTIONS: { value: Certification; label: string }[] = [
  { value: 'ap_mechanic', label: 'A&P Mechanic' },
  { value: 'ia_inspector', label: 'IA (Inspection Authorization)' },
  { value: 'powerplant', label: 'Powerplant' },
  { value: 'airframe', label: 'Airframe' },
  { value: 'avionics', label: 'Avionics' },
  { value: 'ndt_certified', label: 'NDT Certified' },
  { value: 'rts_authority', label: 'RTS Authority' },
  { value: 'welding_certified', label: 'Welding Certified' },
];

const glassStyle: React.CSSProperties = {
  background: 'rgba(20, 20, 24, 0.75)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 16,
  color: '#e8e8e8',
};

interface ProfilesPanelProps {
  currentProfile: PersonProfile | null;
  onSelectProfile: (p: PersonProfile) => void;
  onClose: () => void;
}

export function ProfilesPanel({ currentProfile, onSelectProfile, onClose }: ProfilesPanelProps) {
  const [customProfiles, setCustomProfiles] = useState<PersonProfile[]>(() => loadCustomProfiles());
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCertifications, setNewCertifications] = useState<Certification[]>([]);
  const [newExperienceLevel, setNewExperienceLevel] = useState(false);
  const [newSafetyItems, setNewSafetyItems] = useState('');
  const [newTaskCardItems, setNewTaskCardItems] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newAircraftType, setNewAircraftType] = useState('');
  const [newTailNumber, setNewTailNumber] = useState('');
  const [newMaintenanceType, setNewMaintenanceType] = useState('');
  const [newWorkNotes, setNewWorkNotes] = useState('');

  const allProfiles = [...PRESET_PROFILES, ...customProfiles];

  const toggleCertification = (v: Certification) => {
    setNewCertifications((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const addTechnician = () => {
    const name = newName.trim() || 'New technician';
    const safetyRequirements = newSafetyItems
      .split(/[,;]\s*|\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((item) => ({ item, severity: 'required' as const }));
    const taskCardItems = newTaskCardItems
      .split(/[,;]\s*|\n/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const maintenanceType = newMaintenanceType.split(/[,;]\s*|\n/).map((s) => s.trim()).filter(Boolean);
    const profile: PersonProfile = {
      id: `custom-${Date.now()}`,
      name,
      certifications: newCertifications,
      experienceLevel: newExperienceLevel,
      safetyRequirements,
      taskCardItems,
      notes: newNotes.trim() || undefined,
      workContext:
        newAircraftType.trim() || newTailNumber.trim() || maintenanceType.length > 0 || newWorkNotes.trim()
          ? {
              aircraftType: newAircraftType.trim() || undefined,
              aircraftTailNumber: newTailNumber.trim() || undefined,
              maintenanceType: maintenanceType.length > 0 ? maintenanceType : undefined,
              workNotes: newWorkNotes.trim() || undefined,
            }
          : undefined,
    };
    const next = [...customProfiles, profile];
    setCustomProfiles(next);
    saveCustomProfiles(next);
    setAdding(false);
    setNewName('');
    setNewCertifications([]);
    setNewExperienceLevel(false);
    setNewSafetyItems('');
    setNewTaskCardItems('');
    setNewNotes('');
    setNewAircraftType('');
    setNewTailNumber('');
    setNewMaintenanceType('');
    setNewWorkNotes('');
    onSelectProfile(profile);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...glassStyle,
          width: '100%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#fff' }}>Technician Profile</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          Overlay and analysis use this profile (certifications, work context, task card, safety requirements).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {allProfiles.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => onSelectProfile(p)}
              style={{
                padding: '12px 16px',
                textAlign: 'left',
                background: currentProfile?.id === p.id ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${currentProfile?.id === p.id ? 'rgba(0,255,136,0.5)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                {p.certifications.length ? `${p.certifications.join(', ')} · ` : ''}
                {p.experienceLevel ? 'Senior · ' : ''}
                {p.safetyRequirements.length ? `${p.safetyRequirements.length} safety items · ` : ''}
                {p.taskCardItems.length ? `${p.taskCardItems.length} on task card` : ''}
              </div>
              {p.workContext && (p.workContext.aircraftType || p.workContext.workOrderNumber || p.workContext.maintenanceType?.length || p.workContext.workNotes) && (
                <div style={{ fontSize: 10, color: '#666', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {p.workContext.aircraftType ? `Aircraft: ${p.workContext.aircraftType}${p.workContext.aircraftTailNumber ? ` (${p.workContext.aircraftTailNumber})` : ''}. ` : ''}
                  {p.workContext.maintenanceType?.length ? `Type: ${p.workContext.maintenanceType.join(', ')}. ` : ''}
                  {p.workContext.workNotes ? p.workContext.workNotes.slice(0, 60) + (p.workContext.workNotes.length > 60 ? '…' : '') : ''}
                </div>
              )}
            </button>
          ))}
        </div>
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            style={{
              width: '100%',
              padding: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px dashed rgba(255,255,255,0.2)',
              borderRadius: 12,
              color: '#888',
              cursor: 'pointer',
            }}
          >
            + Add new technician
          </button>
        ) : (
          <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
            <input
              type="text"
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 12,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Certifications</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CERTIFICATION_OPTIONS.map((o) => (
                  <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newCertifications.includes(o.value)}
                      onChange={() => toggleCertification(o.value)}
                    />
                    <span style={{ fontSize: 12 }}>{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newExperienceLevel}
                onChange={(e) => setNewExperienceLevel(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>Senior technician / lead mechanic</span>
            </label>
            <input
              type="text"
              placeholder="Safety requirements (e.g. Safety glasses, Hearing protection)"
              value={newSafetyItems}
              onChange={(e) => setNewSafetyItems(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 12,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <textarea
              placeholder="Task card items (one per line or comma-separated)"
              value={newTaskCardItems}
              onChange={(e) => setNewTaskCardItems(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 12,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
                resize: 'vertical',
              }}
            />
            <div style={{ fontSize: 11, color: '#00ff88', marginBottom: 6 }}>Work Context</div>
            <input
              type="text"
              placeholder="Aircraft type (e.g. Cessna 172N)"
              value={newAircraftType}
              onChange={(e) => setNewAircraftType(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 8,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <input
              type="text"
              placeholder="Tail number (e.g. N12345)"
              value={newTailNumber}
              onChange={(e) => setNewTailNumber(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 8,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <input
              type="text"
              placeholder="Maintenance type (e.g. scheduled, inspection, AD compliance)"
              value={newMaintenanceType}
              onChange={(e) => setNewMaintenanceType(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 8,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <input
              type="text"
              placeholder="Work notes (e.g. Annual inspection, check AD 2024-15-06)"
              value={newWorkNotes}
              onChange={(e) => setNewWorkNotes(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 12,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 12,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={addTechnician}
                style={{
                  flex: 1,
                  padding: 10,
                  background: '#00ff88',
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                style={{
                  padding: 10,
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ccc',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
