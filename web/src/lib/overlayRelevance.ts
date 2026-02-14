/**
 * Per-item overlay relevance from technician profile: task card match + optional context from Gemini.
 */

import type { PersonProfile } from './rag';
import { isOnTaskCard } from './rag';

export type EmphasisLevel = 'high' | 'medium' | 'none';

export interface OverlaySnippet {
  emphasis: EmphasisLevel;
  /** e.g. "On task card" */
  badge?: string;
  /** Short line for overlay: "AD Required", "Due for inspection", "Critical", etc. */
  line?: string;
}

/** Compute overlay snippet: task card badge + maintenance relevance line from API. */
export function getOverlaySnippet(label: string, profile: PersonProfile | null, relevanceFromApi?: string): OverlaySnippet {
  if (!profile) {
    return { emphasis: 'none' };
  }
  const onCard = isOnTaskCard(label, profile);
  const hasRelevance = Boolean(relevanceFromApi?.trim());
  if (onCard && hasRelevance) {
    return {
      emphasis: 'high',
      badge: 'On task card',
      line: relevanceFromApi!.trim(),
    };
  }
  if (onCard) {
    return { emphasis: 'high', badge: 'On task card' };
  }
  if (hasRelevance) {
    return { emphasis: 'high', line: relevanceFromApi!.trim() };
  }
  return { emphasis: 'none' };
}
