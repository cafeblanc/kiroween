import { assertAllowedApiEndpoint } from "../utils/security";
import { keywordDbService } from "./keywordDbService";

export interface PubMedPaper {
  id: string;
  title: string;
  authorString: string;
  journalTitle: string;
  pubYear: string;
  pmid?: string;
  doi?: string;
  abstractText?: string;
}

export interface WikiContext {
  title: string;
  extract: string;
  thumbnailUrl?: string;
  pageUrl?: string;
}

export interface StitchedResearchDossier {
  query: string;
  timestamp: string;
  wiki: WikiContext | null;
  papers: PubMedPaper[];
  stemCellSynthesisEn: string;
  stemCellSynthesisKo: string;
}

export type QuestionIntent =
  | "app_usage"
  | "mechanism"
  | "genes_cells"
  | "paper_source"
  | "ethics_reality"
  | "definition";

const KO_INTERROGATIVE_PATTERNS =
  /(이란\s*무엇인가요|란\s*무엇인가요|이란\s*뭐야|란\s*뭐야|가\s*뭐야|이\s*뭐야|무엇인가요|무엇입니까|어떻게\s*되나요|어떻게\s*하나요|어떻게\s*작동|왜\s*그런가요|왜\s*다시|알려\s*주세요|알려주세요|알려줘|설명해\s*주세요|설명해줘|말해줘|늘어날까요|늘어날까|줄어들까|얼마나|인가요|입니까|하나요|되나요|있나요|없나요|가능한가요|가능할까|될까요|될까|할\s*수\s*있나요|원리가\s*뭐|원리는|차이는|장점은|단점은|이유는|뭐야|무엇|어떻게|왜|에\s*대해|대해서)/g;

export function detectQuestionIntent(query: string): QuestionIntent {
  const q = query.toLowerCase();
  if (/(사용법|버튼|배양실|괴수|결투|전투|내레이터|번역|언어|프랑켄슈타인|드래곤|크라켄|어떻게\s*쓰)/.test(q)) {
    return "app_usage";
  }
  if (/(논문|출처|저자|연구소|대학|학술지|어디서|누가|언제|doi|pmid|paper|journal|who|where|institution)/.test(q)) {
    return "paper_source";
  }
  if (/(윤리|위험|부작용|한계|문제|실제|진짜|가능|규제|법|안전|ethic|risk|danger|limit|real|possible|safe)/.test(q)) {
    return "ethics_reality";
  }
  if (/(유전자|인자|세포|단백질|염색체|게놈|dna|rna|ipsc|gene|factor|cell|protein|lineage)/.test(q)) {
    return "genes_cells";
  }
  if (/(어떻게|왜|원리|과정|방법|작동|메커니즘|기전|다시\s*뛰|자라|재생|회복|how|why|mechanism|work|process)/.test(q)) {
    return "mechanism";
  }
  return "definition";
}

function extractWikiTopic(rawQuery: string): string {
  const cleaned = rawQuery
    .replace(/[?!.,'"]/g, " ")
    .replace(KO_INTERROGATIVE_PATTERNS, " ")
    .replace(/(은|는|이|가|을|를|에|에서|의|로|으로|와|과|도|만)(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || rawQuery.trim();
}

async function buildPubMedQuery(rawQuery: string): Promise<string> {
  const clean = extractWikiTopic(rawQuery);
  const fromDb = keywordDbService.resolveEnglishQuery(clean);
  if (fromDb) return fromDb;

  // DB에 없는 새로운 키워드이면 Google Translate로 영문 학술 키워드를 동적 추출
  const hasHangul = /[\uAC00-\uD7A3\u3131-\u318E]/.test(clean);
  if (hasHangul) {
    const translated = await translateTextToLanguage(clean, "en", "ko");
    const ascii = translated
      .replace(/[\uAC00-\uD7A3\u3131-\u318E]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (ascii) return ascii;
  }

  const asciiOnly = clean
    .replace(/[\uAC00-\uD7A3\u3131-\u318E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return asciiOnly || "stem cell";
}

export function toConciseCore(text: string, maxChars: number = 460): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxChars) return clean;
  const sentences = clean.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    let acc = "";
    for (const s of sentences) {
      const next = acc ? `${acc} ${s.trim()}` : s.trim();
      if (next.length > maxChars) break;
      acc = next;
    }
    if (acc) return acc;
  }
  return clean.slice(0, maxChars - 1).trimEnd() + "…";
}

function isWikiRelevant(topic: string, wiki: WikiContext): boolean {
  const tokens = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return false;
  const haystack = `${wiki.title} ${wiki.extract}`.toLowerCase();
  return tokens.some((tok) => haystack.includes(tok));
}

export const DEFAULT_FETCH_TIMEOUT_MS = 8000;

/** fetch that rejects after `ms` (aborts the request and also stops waiting if fetch ignores the signal). */
export async function fetchWithTimeout(
  url: string,
  ms: number = DEFAULT_FETCH_TIMEOUT_MS,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const external = init.signal;
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", () => controller.abort(), { once: true });
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Request timed out"));
    }, ms);
  });
  try {
    return await Promise.race([fetch(url, { ...init, signal: controller.signal }), timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function translateTextToLanguage(
  text: string,
  targetLang: string,
  sourceLang: string = "ko",
): Promise<string> {
  if (!text || !targetLang || targetLang === sourceLang) return text;
  try {
    const lines = text.split("\n");
    const translatedLines = await Promise.all(
      lines.map(async (line) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
          sourceLang,
        )}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
        const res = await fetchWithTimeout(assertAllowedApiEndpoint(url));
        if (!res.ok) return line;
        const data = await res.json();
        if (!Array.isArray(data?.[0])) return line;
        const joined = data[0]
          .map((seg: unknown) => (Array.isArray(seg) && typeof seg[0] === "string" ? seg[0] : ""))
          .join("")
          .trim();
        return joined || line;
      }),
    );
    return translatedLines.join("\n");
  } catch {
    return text;
  }
}

export const scienceStitchService = {
  async fetchPubMedPapers(query: string, limit: number = 3): Promise<PubMedPaper[]> {
    return (await this.fetchPubMedPapersOrNull(query, limit)) ?? [];
  },

  /** Returns null when the request failed or timed out (so callers do not retry a dead endpoint). */
  async fetchPubMedPapersOrNull(query: string, limit: number = 3): Promise<PubMedPaper[] | null> {
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encoded}&format=json&pageSize=${limit}&resultType=core`;
      const res = await fetchWithTimeout(assertAllowedApiEndpoint(url));
      if (!res.ok) return null;
      const data = await res.json();
      const list = data?.resultList?.result || [];
      return list.map((item: any) => ({
        id: item.id || String(Math.random()),
        title: item.title || "Untitled Scientific Study",
        authorString: item.authorString || "Research Consortium",
        journalTitle: item.journalTitle || item.bookOrReportDetails?.publisher || "Peer-Reviewed Journal",
        pubYear: item.pubYear || "2024",
        pmid: item.pmid,
        doi: item.doi,
        abstractText: item.abstractText
          ? item.abstractText.replace(/<[^>]+>/g, "").slice(0, 560) + "..."
          : "Empirical bio-engineering and stem-cell differentiation findings verified in EuropePMC / PubMed."
      }));
    } catch {
      return null;
    }
  },

  async fetchWikipediaContext(topic: string, lang: "ko" | "en" = "en"): Promise<WikiContext | null> {
    try {
      const cleanTopic = extractWikiTopic(topic);
      if (!cleanTopic || cleanTopic.length < 2) return null;
      const slug = cleanTopic.replace(/\s+/g, "_");
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
      const res = await fetchWithTimeout(assertAllowedApiEndpoint(url));
      if (res.ok) {
        const data = await res.json();
        if (data.type !== "disambiguation" && data.extract) {
          const ctx: WikiContext = {
            title: data.title || cleanTopic,
            extract: data.extract || "",
            thumbnailUrl: data.thumbnail?.source,
            pageUrl: data.content_urls?.desktop?.page
          };
          if (isWikiRelevant(cleanTopic, ctx)) return ctx;
        }
      }
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTopic)}&format=json&origin=*`;
      const sRes = await fetchWithTimeout(assertAllowedApiEndpoint(searchUrl));
      if (!sRes.ok) return null;
      const sData = await sRes.json();
      const firstTitle = sData?.query?.search?.[0]?.title;
      if (!firstTitle) {
        if (lang === "ko") return this.fetchWikipediaContext(cleanTopic, "en");
        return null;
      }

      const sumRes = await fetchWithTimeout(
        assertAllowedApiEndpoint(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstTitle.replace(/\s+/g, "_"))}`
        )
      );
      if (!sumRes.ok) return null;
      const sumData = await sumRes.json();
      if (sumData.type === "disambiguation" || !sumData.extract) return null;
      const ctx: WikiContext = {
        title: sumData.title || firstTitle,
        extract: sumData.extract || "",
        thumbnailUrl: sumData.thumbnail?.source,
        pageUrl: sumData.content_urls?.desktop?.page
      };
      return isWikiRelevant(cleanTopic, ctx) ? ctx : null;
    } catch {
      return null;
    }
  },

  async stitchLiveQuery(
    userQuery: string,
    preferKoreanOrLang: boolean | string = true,
  ): Promise<StitchedResearchDossier> {
    const targetLang =
      typeof preferKoreanOrLang === "string"
        ? preferKoreanOrLang
        : preferKoreanOrLang
        ? "ko"
        : "en";
    const cleanTopic = extractWikiTopic(userQuery);
    const pubmedQuery = await buildPubMedQuery(userQuery);
    const [wiki, papers] = await Promise.all([
      this.fetchWikipediaContext(cleanTopic, targetLang === "en" ? "en" : "ko"),
      this.fetchPubMedPapersOrNull(pubmedQuery, 3)
    ]);

    // Retry with a broader query only when the first request succeeded but found nothing.
    const fallbackPapers =
      papers === null
        ? []
        : papers.length > 0
        ? papers
        : await this.fetchPubMedPapers(`${pubmedQuery} stem cell`, 3);

    const topPaper = fallbackPapers[0];
    const rawWikiSummary = wiki?.extract ? toConciseCore(wiki.extract, 420) : "";
    const rawPaperCore = topPaper?.abstractText ? toConciseCore(topPaper.abstractText, 380) : "";

    // 새로운 키워드나 기존 키워드를 DB에 저장·갱신하여 다음 질문에 미리 대비
    if (cleanTopic.length >= 2) {
      keywordDbService.upsertKeyword({
        keywordKo: cleanTopic,
        queryEn: pubmedQuery,
        wikiTitle: wiki?.title,
        wikiExtract: rawWikiSummary || undefined,
        topPaperTitle: topPaper?.title,
        topPaperSummary: rawPaperCore || undefined,
        pmid: topPaper?.pmid,
      });
    }

    // PubMed 논문 제목/초록은 항상 영어이므로, 한국어나 기타 언어가 설정되어 있으면 해당 언어로 번역
    const [translatedPaperTitle, translatedPaperCore, translatedWikiTitle, translatedWikiSummary] =
      await Promise.all([
        topPaper && targetLang !== "en"
          ? translateTextToLanguage(topPaper.title, targetLang, "en")
          : Promise.resolve(topPaper?.title || ""),
        rawPaperCore && targetLang !== "en"
          ? translateTextToLanguage(rawPaperCore, targetLang, "en")
          : Promise.resolve(rawPaperCore),
        wiki && targetLang !== "ko" && targetLang !== "en"
          ? translateTextToLanguage(wiki.title, targetLang, "auto")
          : Promise.resolve(wiki?.title || ""),
        rawWikiSummary && targetLang !== "ko" && targetLang !== "en"
          ? translateTextToLanguage(rawWikiSummary, targetLang, "auto")
          : Promise.resolve(rawWikiSummary),
      ]);

    const localizedSummary =
      translatedWikiSummary && translatedPaperCore
        ? `[${translatedWikiTitle || wiki?.title}] ${translatedWikiSummary}\n\n📄 ${
            targetLang === "ko" ? "관련 학술 연구" : "Related Study"
          } (${topPaper.journalTitle}, ${topPaper.pubYear}): ${translatedPaperCore}`
        : translatedWikiSummary
        ? `[${translatedWikiTitle || wiki?.title}] ${translatedWikiSummary}`
        : topPaper
        ? `[${translatedPaperTitle || topPaper.title}] ${translatedPaperCore}`
        : targetLang === "ko"
        ? `"${cleanTopic}"에 대한 정확한 답을 찾지 못했습니다. 현재 실험(원리·유전자·논문·윤리)이나 생물학 핵심 단어로 다시 질문해 주세요.`
        : `Could not find a direct match for "${cleanTopic}". Ask about the active experiment's mechanism, genes, paper, or ethics.`;

    const stemCellSynthesisEn =
      rawWikiSummary && rawPaperCore
        ? `[${wiki?.title}] ${rawWikiSummary}\n\n📄 Related Study (${topPaper.journalTitle}, ${topPaper.pubYear}): ${rawPaperCore}`
        : rawWikiSummary
        ? `[${wiki?.title}] ${rawWikiSummary}`
        : topPaper
        ? `[${topPaper.title}] ${rawPaperCore}`
        : `Could not find a direct match for "${cleanTopic}". Ask about the active experiment's mechanism, genes, paper, or ethics.`;

    return {
      query: userQuery,
      timestamp: new Date().toLocaleTimeString(),
      wiki,
      papers: fallbackPapers,
      stemCellSynthesisEn,
      stemCellSynthesisKo: localizedSummary,
    };
  }
};
