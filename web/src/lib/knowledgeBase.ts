/**
 * RAG knowledge base: loads pre-extracted Cessna 172 Service Manual content,
 * searches by component keywords, and returns relevant chunks with page references.
 */

export interface ManualRef {
  page: number;
  section: string;
  sectionTitle: string;
  figure?: string | null;
  figureTitle?: string | null;
  pdfUrl: string;        // e.g. "/manuals/cessna172-sm.pdf#page=377"
}

export interface KBChunk {
  id: string;
  component: string;
  keywords: string[];
  section: string;
  sectionTitle: string;
  page: number;
  figure?: string | null;
  figureTitle?: string | null;
  content: string;
  table?: string | null;
}

export interface KBSearchResult {
  chunks: KBChunk[];
  /** Best single manual reference for overlay display */
  primaryRef: ManualRef | null;
  /** All page references */
  refs: ManualRef[];
  /** Concatenated context text for injection into AI prompts */
  contextText: string;
}

interface KBData {
  manual: {
    title: string;
    documentNumber: string;
    revision: string;
    totalPages: number;
    pdfFile: string;
  };
  chunks: KBChunk[];
}

let _kb: KBData | null = null;
let _loading: Promise<KBData> | null = null;

/** Load the knowledge base JSON (cached after first load). */
export async function loadKnowledgeBase(): Promise<KBData> {
  if (_kb) return _kb;
  if (_loading) return _loading;
  _loading = fetch('/cessna172-kb.json')
    .then((res) => {
      if (!res.ok) throw new Error(`KB load failed: ${res.status}`);
      return res.json() as Promise<KBData>;
    })
    .then((data) => {
      _kb = data;
      return data;
    })
    .catch((err) => {
      console.warn('Knowledge base load failed:', err);
      _loading = null;
      // Return empty KB
      const empty: KBData = {
        manual: { title: '', documentNumber: '', revision: '', totalPages: 0, pdfFile: '' },
        chunks: [],
      };
      _kb = empty;
      return empty;
    });
  return _loading;
}

/** Preload KB on module import (non-blocking). */
loadKnowledgeBase();

/** Search the knowledge base for chunks relevant to a component label. */
export async function searchKB(componentLabel: string, maxChunks = 5): Promise<KBSearchResult> {
  const kb = await loadKnowledgeBase();
  if (!kb.chunks.length) {
    return { chunks: [], primaryRef: null, refs: [], contextText: '' };
  }

  const query = componentLabel.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const queryWords = query.split(/\s+/).filter(Boolean);

  // Score each chunk by keyword overlap with the query
  const scored = kb.chunks.map((chunk) => {
    let score = 0;
    const allKeywords = [...chunk.keywords, chunk.component, chunk.sectionTitle].map((k) =>
      k.toLowerCase()
    );

    for (const word of queryWords) {
      // Direct keyword match
      for (const kw of allKeywords) {
        if (kw === word) { score += 10; break; }
        if (kw.includes(word)) { score += 5; break; }
        if (word.includes(kw) && kw.length > 3) { score += 3; break; }
      }
    }

    // Full phrase match in keywords
    for (const kw of chunk.keywords) {
      if (kw.toLowerCase() === query) { score += 20; break; }
      if (query.includes(kw.toLowerCase()) && kw.length > 3) score += 8;
    }

    // Component name match
    if (chunk.component.toLowerCase() === query) score += 25;
    if (query.includes(chunk.component.toLowerCase())) score += 12;
    if (chunk.component.toLowerCase().includes(query)) score += 12;

    // Content contains query words
    const contentLower = chunk.content.toLowerCase();
    for (const word of queryWords) {
      if (word.length > 3 && contentLower.includes(word)) score += 2;
    }

    return { chunk, score };
  });

  // Filter and sort
  const matches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks);

  if (matches.length === 0) {
    return { chunks: [], primaryRef: null, refs: [], contextText: '' };
  }

  const pdfBase = kb.manual.pdfFile || '/manuals/cessna172-sm.pdf';

  const refs: ManualRef[] = matches.map((m) => ({
    page: m.chunk.page,
    section: m.chunk.section,
    sectionTitle: m.chunk.sectionTitle,
    figure: m.chunk.figure,
    figureTitle: m.chunk.figureTitle,
    pdfUrl: `${pdfBase}#page=${m.chunk.page}`,
  }));

  // Deduplicate refs by page
  const seenPages = new Set<number>();
  const uniqueRefs = refs.filter((r) => {
    if (seenPages.has(r.page)) return false;
    seenPages.add(r.page);
    return true;
  });

  const contextText = matches
    .map((m) => {
      const fig = m.chunk.figure ? ` (Figure ${m.chunk.figure}: ${m.chunk.figureTitle})` : '';
      return `[SM Section ${m.chunk.section}, p.${m.chunk.page}${fig}]: ${m.chunk.content}`;
    })
    .join('\n\n');

  return {
    chunks: matches.map((m) => m.chunk),
    primaryRef: uniqueRefs[0] ?? null,
    refs: uniqueRefs,
    contextText,
  };
}

/** Quick synchronous lookup — returns null if KB not loaded yet. */
export function searchKBSync(componentLabel: string, maxChunks = 3): KBSearchResult | null {
  if (!_kb) return null;
  const query = componentLabel.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const queryWords = query.split(/\s+/).filter(Boolean);

  const scored = _kb.chunks.map((chunk) => {
    let score = 0;
    const allKw = [...chunk.keywords, chunk.component].map((k) => k.toLowerCase());
    for (const word of queryWords) {
      for (const kw of allKw) {
        if (kw.includes(word) || word.includes(kw)) { score += 5; break; }
      }
    }
    if (chunk.component.toLowerCase().includes(query) || query.includes(chunk.component.toLowerCase())) score += 15;
    return { chunk, score };
  });

  const matches = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, maxChunks);
  if (!matches.length) return null;

  const pdfBase = _kb.manual.pdfFile || '/manuals/cessna172-sm.pdf';
  const seenPages = new Set<number>();
  const refs: ManualRef[] = [];
  for (const m of matches) {
    if (!seenPages.has(m.chunk.page)) {
      seenPages.add(m.chunk.page);
      refs.push({
        page: m.chunk.page,
        section: m.chunk.section,
        sectionTitle: m.chunk.sectionTitle,
        figure: m.chunk.figure,
        figureTitle: m.chunk.figureTitle,
        pdfUrl: `${pdfBase}#page=${m.chunk.page}`,
      });
    }
  }

  return {
    chunks: matches.map((m) => m.chunk),
    primaryRef: refs[0] ?? null,
    refs,
    contextText: matches.map((m) => `[SM p.${m.chunk.page}]: ${m.chunk.content}`).join('\n'),
  };
}
