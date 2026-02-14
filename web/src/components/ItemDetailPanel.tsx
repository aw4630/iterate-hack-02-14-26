import React, { useCallback, useState } from 'react';
import type { ItemDetails } from '../lib/itemDetails';
import type { PersonProfile } from '../lib/rag';
import { getIngredientExplanation } from '../lib/ingredientExplanation';
import type { ManualRef } from '../lib/knowledgeBase';

interface ItemDetailPanelProps {
  details: ItemDetails | null;
  onClose: () => void;
  onAskVoice?: () => void;
  isVoiceLoading?: boolean;
  detailsLoading?: boolean;
  currentProfile?: PersonProfile | null;
}

function ManualRefLink({ manualRef: mRef, compact }: { manualRef: ManualRef; compact?: boolean }) {
  const fig = mRef.figure ? `, Fig ${mRef.figure}` : '';
  const mName = mRef.manualName || 'SM';
  const label = compact
    ? `${mName} p.${mRef.page}${fig}`
    : `[${mName}] Section ${mRef.section}: ${mRef.sectionTitle} — p.${mRef.page}${fig}`;
  return (
    <a
      href={mRef.pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.stopPropagation();
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '3px 8px' : '6px 12px',
        background: 'rgba(0, 150, 255, 0.12)',
        border: '1px solid rgba(0, 150, 255, 0.3)',
        borderRadius: 8,
        color: '#4da6ff',
        fontSize: compact ? 11 : 12,
        fontWeight: 500,
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(0, 150, 255, 0.25)'; }}
      onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'rgba(0, 150, 255, 0.12)'; }}
      title={`Open Cessna 172 SM page ${mRef.page}${mRef.figureTitle ? ` — ${mRef.figureTitle}` : ''}`}
    >
      <span style={{ fontSize: compact ? 12 : 14 }}>📖</span>
      {label}
    </a>
  );
}

export function ItemDetailPanel({ details, onClose, onAskVoice, isVoiceLoading, detailsLoading, currentProfile: _currentProfile }: ItemDetailPanelProps) {
  void _currentProfile; // reserved for future use
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
    manualRefs,
  } = details;

  const section = (label: string, children: React.ReactNode, accent?: boolean) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: '#667', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ color: accent ? '#00ff88' : '#e0e0e0', fontSize: 13, lineHeight: 1.45 }}>{children}</div>
    </div>
  );

  const glassStyle: React.CSSProperties = {
    background: 'rgba(12, 14, 18, 0.88)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 360,
        maxWidth: 'calc(100vw - 32px)',
        ...glassStyle,
        borderRadius: 16,
        padding: 20,
        color: '#fff',
        zIndex: 25,
        maxHeight: '85vh',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#00ff88', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {name}
          </h2>
          {detailsLoading && <span style={{ fontSize: 11, color: '#667', fontWeight: 400 }}>Analyzing component…</span>}
          {partNumber && !detailsLoading && (
            <div style={{ fontSize: 12, color: '#4da6ff', marginTop: 3, fontFamily: 'monospace' }}>{partNumber}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: '#667',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: '4px 8px',
            borderRadius: 8,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Manual References — always show prominently at top */}
      {!detailsLoading && manualRefs && manualRefs.length > 0 && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          background: 'rgba(0, 150, 255, 0.06)',
          border: '1px solid rgba(0, 150, 255, 0.15)',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 10, color: '#4da6ff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>
            📖 Service Manual References
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {manualRefs.slice(0, 4).map((mRef, i) => (
              <ManualRefLink key={`${mRef.page}-${i}`} manualRef={mRef} />
            ))}
          </div>
        </div>
      )}

      {detailsLoading && (
        <div style={{ padding: '16px 0', color: '#667', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #334', borderTop: '2px solid #00ff88', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Searching maintenance knowledge base…
          </div>
        </div>
      )}

      {!detailsLoading && manufacturer && section('Manufacturer', manufacturer)}
      {!detailsLoading && specs && section('Specifications',
        [specs.material, specs.weight ? `Weight: ${specs.weight}` : null, specs.serviceLife ? `Service life: ${specs.serviceLife}` : null, specs.operatingLimits ? `Limits: ${specs.operatingLimits}` : null].filter(Boolean).join(' · ')
      )}

      {!detailsLoading && safetyInfo && safetyInfo.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#667', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontWeight: 600 }}>Safety</div>
          {safetyInfo.map((s, i) => (
            <div key={i} style={{ color: '#ffaa00', marginBottom: 3, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ flexShrink: 0, fontSize: 11, marginTop: 2 }}>⚠️</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {!detailsLoading && (priceAtAircraftSpruce != null || (priceElsewhere?.length ?? 0) > 0) && section('Supplier Pricing', [priceAtAircraftSpruce != null ? `Aircraft Spruce $${priceAtAircraftSpruce.toFixed(2)}` : null, ...(priceElsewhere ?? []).map((e) => `${e.store} $${e.price.toFixed(2)}`)].filter(Boolean).join(' · '))}

      {!detailsLoading && procedures && procedures.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#667', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>Procedures</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {procedures.map((proc, i) => (
              <button
                type="button"
                key={`${proc}-${i}`}
                onClick={() => handleProcedureClick(proc)}
                disabled={procedureLoading !== null}
                style={{
                  padding: '7px 10px',
                  background: procedureLoading === proc ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  color: '#ccc',
                  fontSize: 12,
                  cursor: procedureLoading === proc ? 'wait' : 'pointer',
                  textAlign: 'left',
                  lineHeight: 1.35,
                }}
              >
                {proc}
                {procedureLoading === proc ? ' …' : ''}
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
                border: '1px solid rgba(0,255,136,0.2)',
              }}
            >
              <div style={{ fontSize: 11, color: '#00ff88', marginBottom: 6, fontWeight: 600 }}>{procedurePopup.procedure}</div>
              <p style={{ margin: 0, fontSize: 12, color: '#bbb', lineHeight: 1.5 }}>{procedurePopup.explanation}</p>
              <button
                type="button"
                onClick={() => setProcedurePopup(null)}
                style={{ marginTop: 8, fontSize: 11, color: '#667', background: 'none', border: 'none', cursor: 'pointer' }}
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

      {/* Voice Q&A */}
      {onAskVoice && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            type="button"
            onClick={onAskVoice}
            disabled={isVoiceLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '10px 14px',
              background: isVoiceLoading ? 'rgba(0,255,136,0.15)' : 'rgba(0,255,136,0.08)',
              border: '1px solid rgba(0,255,136,0.3)',
              borderRadius: 10,
              color: '#00ff88',
              fontSize: 13,
              fontWeight: 500,
              cursor: isVoiceLoading ? 'wait' : 'pointer',
            }}
          >
            <span style={{ fontSize: 16 }}>{isVoiceLoading ? '◐' : '🎤'}</span>
            {isVoiceLoading ? 'Listening… Ask your question' : 'Ask about this component (voice)'}
          </button>
          {voiceAnswer && (
            <div style={{ marginTop: 10, padding: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 8, fontSize: 12, color: '#bbb', lineHeight: 1.5 }}>
              {voiceAnswer}
            </div>
          )}
        </div>
      )}

      {/* Spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
