/**
 * Per-item overlay relevance from technician profile + knowledge base manual refs.
 */

import type { PersonProfile } from './rag';
import { isOnTaskCard } from './rag';
import { searchKBSync, type ManualRef } from './knowledgeBase';

export type EmphasisLevel = 'high' | 'medium' | 'none';

export interface OverlaySnippet {
  emphasis: EmphasisLevel;
  /** e.g. "On task card" */
  badge?: string;
  /** Short line for overlay: "AD Required", "Due for inspection", "SM p.377", etc. */
  line?: string;
  /** Manual page reference for quick display */
  manualRef?: ManualRef;
}

/** Compute overlay snippet: task card badge + manual ref + optional API relevance. */
export function getOverlaySnippet(label: string, profile: PersonProfile | null, relevanceFromApi?: string): OverlaySnippet {
  // Always try to get a manual reference, even without a profile
  const kbResult = searchKBSync(label, 1);
  const manualRef = kbResult?.primaryRef ?? undefined;

  if (!profile) {
    if (manualRef) {
      const mName = manualRef.manualName || 'SM';
      const fig = manualRef.figure ? `, Fig ${manualRef.figure}` : '';
      return { emphasis: 'medium', line: `${mName} p.${manualRef.page}${fig}`, manualRef };
    }
    return { emphasis: 'none' };
  }

  const onCard = isOnTaskCard(label, profile);
  const hasRelevance = Boolean(relevanceFromApi?.trim());

  // Build the display line
  let line = '';
  if (hasRelevance) line = relevanceFromApi!.trim();
  if (manualRef && !line.includes(' p.')) {
    const mName = manualRef.manualName || 'SM';
    const fig = manualRef.figure ? `, Fig ${manualRef.figure}` : '';
    const smRef = `${mName} p.${manualRef.page}${fig}`;
    line = line ? `${line} · ${smRef}` : smRef;
  }

  if (onCard && line) {
    return { emphasis: 'high', badge: 'On task card', line, manualRef };
  }
  if (onCard) {
    return { emphasis: 'high', badge: 'On task card', manualRef };
  }
  if (line) {
    return { emphasis: manualRef ? 'medium' : 'high', line, manualRef };
  }
  return { emphasis: 'none', manualRef };
}
