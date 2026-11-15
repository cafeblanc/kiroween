import seedEntries from "../data/bioKeywordSeed.json";

export interface KeywordDbEntry {
  keywordKo: string;
  queryEn: string;
  wikiTitle?: string;
  wikiExtract?: string;
  topPaperTitle?: string;
  topPaperSummary?: string;
  pmid?: string;
  hitCount: number;
  lastAskedAt: string;
}

export const KEYWORD_DB_STORAGE_KEY = "prometheus_bio_keyword_db_v1";

function buildInitialEntries(): KeywordDbEntry[] {
  const now = new Date().toISOString();
  return (seedEntries as Array<{ keywordKo: string; queryEn: string }>).map((item) => ({
    keywordKo: item.keywordKo.trim(),
    queryEn: item.queryEn.trim(),
    hitCount: 0,
    lastAskedAt: now,
  }));
}

let memoryEntries: KeywordDbEntry[] | null = null;

function readDb(): KeywordDbEntry[] {
  if (memoryEntries) return memoryEntries;
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(KEYWORD_DB_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryEntries = parsed as KeywordDbEntry[];
          return memoryEntries;
        }
      }
    }
  } catch {
    // Fallback to seed entries if storage is unavailable or corrupted
  }
  memoryEntries = buildInitialEntries();
  writeDb(memoryEntries);
  return memoryEntries;
}

function writeDb(entries: KeywordDbEntry[]): void {
  memoryEntries = entries;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(KEYWORD_DB_STORAGE_KEY, JSON.stringify(entries));
    }
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

export const keywordDbService = {
  resetForTests(): void {
    memoryEntries = null;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(KEYWORD_DB_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  },

  listAll(): KeywordDbEntry[] {
    return [...readDb()];
  },

  /**
   * Find the best matching DB entry for a query (longest matching keyword first).
   */
  findBestMatch(query: string): KeywordDbEntry | null {
    const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    const entries = readDb();
    const sorted = [...entries].sort((a, b) => b.keywordKo.length - a.keywordKo.length);
    return (
      sorted.find((entry) => normalized.includes(entry.keywordKo.toLowerCase())) || null
    );
  },

  /**
   * Build an English biomedical search query from matching DB entries.
   */
  resolveEnglishQuery(query: string): string | null {
    const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    const entries = [...readDb()].sort((a, b) => b.keywordKo.length - a.keywordKo.length);
    const matchedTerms: string[] = [];
    let remaining = normalized;
    for (const entry of entries) {
      const kw = entry.keywordKo.toLowerCase();
      if (kw && remaining.includes(kw)) {
        matchedTerms.push(entry.queryEn);
        remaining = remaining.replace(kw, " ");
      }
    }
    const asciiTokens = remaining
      .replace(/[\uAC00-\uD7A3\u3131-\u318E]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const combined = [...matchedTerms, asciiTokens].filter(Boolean).join(" ").trim();
    return combined || null;
  },

  /**
   * Save a newly discovered keyword & optional pre-cached dossier into the DB.
   */
  upsertKeyword(params: {
    keywordKo: string;
    queryEn: string;
    wikiTitle?: string;
    wikiExtract?: string;
    topPaperTitle?: string;
    topPaperSummary?: string;
    pmid?: string;
  }): KeywordDbEntry {
    const cleanKw = params.keywordKo.replace(/\s+/g, " ").trim();
    const entries = [...readDb()];
    const now = new Date().toISOString();
    const idx = entries.findIndex(
      (e) => e.keywordKo.toLowerCase() === cleanKw.toLowerCase(),
    );
    if (idx >= 0) {
      const existing = entries[idx];
      const updated: KeywordDbEntry = {
        ...existing,
        queryEn: params.queryEn || existing.queryEn,
        wikiTitle: params.wikiTitle ?? existing.wikiTitle,
        wikiExtract: params.wikiExtract ?? existing.wikiExtract,
        topPaperTitle: params.topPaperTitle ?? existing.topPaperTitle,
        topPaperSummary: params.topPaperSummary ?? existing.topPaperSummary,
        pmid: params.pmid ?? existing.pmid,
        hitCount: existing.hitCount + 1,
        lastAskedAt: now,
      };
      entries[idx] = updated;
      writeDb(entries);
      return updated;
    }

    const created: KeywordDbEntry = {
      keywordKo: cleanKw,
      queryEn: params.queryEn.trim() || cleanKw,
      wikiTitle: params.wikiTitle,
      wikiExtract: params.wikiExtract,
      topPaperTitle: params.topPaperTitle,
      topPaperSummary: params.topPaperSummary,
      pmid: params.pmid,
      hitCount: 1,
      lastAskedAt: now,
    };
    entries.unshift(created);
    writeDb(entries);
    return created;
  },
};
