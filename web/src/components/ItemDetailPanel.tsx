import React, { useCallback, useState } from 'react';
import type { ItemDetails } from '../lib/itemDetails';
import type { PersonProfile } from '../lib/rag';
import { getIngredientExplanation } from '../lib/ingredientExplanation';

interface ItemDetailPanelProps {
  details: ItemDetails | null;
  onClose: () => void;
  onAskVoice?: () => void;
  isVoiceLoading?: boolean;
  detailsLoading?: boolean;
  currentProfile?: PersonProfile | null;
}

export function ItemDetailPanel({ details, onClose, onAskVoice, isVoiceLoading, detailsLoading, currentProfile }: ItemDetailPanelProps) {
  const [procedurePopup, setProcedurePopup] = useState<{ procedure: string; explanation: string } | null>(null);
  const [procedureLoading, setProcedureLoading] = useState<string | null>(null);

  const componentName = details?.name ?? '';
  const handleProcedureClick = useCallback(
    (procedure: string) => {
      setProcedureLoading(procedure);
      setProcedurePopup(null);
      getIngredientExplanation(procedure, componentName)
        .then((explanation) => setProcedurePopup({ procedure, explanation }))
        .catch(() => setProcedurePopup({ procedure, explanation: 'Could not load explanation.' }))
        .finally(() => setProcedureLoading(null));
    },
    [componentName]
  );

  if (!details) return null;

  const {
    name,
    partNumber,
    manufacturer,
    specs,
    safetyInfo,
    procedures,
    priceAtAircraftSpruce,
    priceElsewhere,
    installationNotes,
    adReferences,
    voiceAnswer,
    compatibilitySummary,
  } = details;

  const section = (label: string, children: React.ReactNode, accent?: boolean) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: accent ? '#00ff88' : '#e0e0e0', fontSize: 14, lineHeight: 1.4 }}>{children}</div>
    </div>
  );

  const glassStyle: React.CSSProperties = {
    background: 'rgba(18, 20, 24, 0.82)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 340,
        maxWidth: 'calc(100vw - 40px)',
        ...glassStyle,
        borderRadius: 20,
        padding: 20,
        color: '#fff',
        zIndex: 25,
        maxHeight: '85vh',
        overflow: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#00ff88', letterSpacing: '-0.02em' }}>
          {name}
          {detailsLoading && <span style={{ marginLeft: 8, fontSize: 12, color: '#888', fontWeight: 400 }}>Loading…</span>}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
            padding: '4px 8px',
            borderRadius: 8,
          }}
        >
          ×
        </button>
      </div>

      {detailsLoading && (
        <div style={{ padding: '20px 0', color: '#888', fontSize: 14 }}>Fetching component data from maintenance knowledge base…</div>
      )}
      {!detailsLoading && partNumber && section('Part Number', partNumber, true)}
      {!detailsLoading && manufacturer && section('Manufacturer', manufacturer)}
      {!detailsLoading && specs && section('Specifications',
        [specs.material, specs.weight ? `Weight: ${specs.weight}` : null, specs.serviceLife ? `Service life: ${specs.serviceLife}` : null, specs.operatingLimits ? `Limits: ${specs.operatingLimits}` : null].filter(Boolean).join(' · ')
      )}
      {!detailsLoading && safetyInfo && safetyInfo.length > 0 && section('Safety', safetyInfo.map((s, i) => <div key={i} style={{ color: '#ffaa00', marginBottom: 2 }}>⚠ {s}</div>))}
      {!detailsLoading && (priceAtAircraftSpruce != null || (priceElsewhere?.length ?? 0) > 0) && section('Supplier Pricing', [priceAtAircraftSpruce != null ? `Aircraft Spruce $${priceAtAircraftSpruce.toFixed(2)}` : null, ...(priceElsewhere ?? []).map((e) => `${e.store} $${e.price.toFixed(2)}`)].filter(Boolean).join(' · '))}
      {!detailsLoading && procedures && procedures.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Procedures</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {procedures.map((proc, i) => (
              <button
                type="button"
                key={`${proc}-${i}`}
                onClick={() => handleProcedureClick(proc)}
                disabled={procedureLoading !== null}
                style={{
                  padding: '6px 10px',
                  background: procedureLoading === proc ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  color: '#e0e0e0',
                  fontSize: 12,
                  cursor: procedureLoading === proc ? 'wait' : 'pointer',
                  textAlign: 'left',
                }}
              >
                {proc}
                {procedureLoading === proc ? '…' : ''}
              </button>
            ))}
          </div>
          {procedurePopup && (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                background: 'rgba(0,0,0,0.35)',
                borderRadius: 10,
                border: '1px solid rgba(0,255,136,0.25)',
              }}
            >
              <div style={{ fontSize: 11, color: '#00ff88', marginBottom: 6 }}>{procedurePopup.procedure}</div>
              <p style={{ margin: 0, fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>{procedurePopup.explanation}</p>
              <button
                type="button"
                onClick={() => setProcedurePopup(null)}
                style={{ marginTop: 8, fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
      {!detailsLoading && installationNotes && section('Installation', installationNotes)}
      {!detailsLoading && adReferences && Object.keys(adReferences).length > 0 && section('AD / Service Bulletins', Object.entries(adReferences).map(([k, v]) => `${k}: ${v}`).join('; '), true)}
      {!detailsLoading && compatibilitySummary && section('Compatibility', compatibilitySummary, true)}

      {onAskVoice && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={onAskVoice}
            disabled={isVoiceLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '12px 16px',
              background: isVoiceLoading ? 'rgba(0,255,136,0.2)' : 'rgba(0,255,136,0.15)',
              border: '1px solid rgba(0,255,136,0.5)',
              borderRadius: 12,
              color: '#00ff88',
              fontSize: 14,
              fontWeight: 500,
              cursor: isVoiceLoading ? 'wait' : 'pointer',
            }}
          >
            <span style={{ fontSize: 18 }}>{isVoiceLoading ? '◐' : '🎤'}</span>
            {isVoiceLoading ? 'Listening… Ask your question' : 'Ask about this component (voice)'}
          </button>
          {voiceAnswer && (
            <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 10, fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>
              {voiceAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
