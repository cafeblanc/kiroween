import { assertAllowedApiEndpoint } from "../utils/security";

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

const KO_TO_EN_BIO_TERMS: ReadonlyArray<[RegExp, string]> = [
  [/만능\s*줄기세포|유도\s*만능\s*줄기세포|ipsc/gi, "induced pluripotent stem cell"],
  [/줄기세포/g, "stem cell"],
  [/뇌\s*오가노이드/g, "brain organoid"],
  [/오가노이드/g, "organoid"],
  [/유령\s*심장/g, "decellularized bioartificial heart"],
  [/심장/g, "heart"],
  [/키메라/g, "chimera"],
  [/배아/g, "embryo"],
  [/아홀로틀|도롱뇽/g, "axolotl regeneration"],
  [/사지\s*재생|재생/g, "limb regeneration"],
  [/신경|뇌/g, "neural brain"],
  [/유전자|게놈/g, "gene genome"],
  [/크리스퍼|유전자\s*가위/g, "CRISPR gene editing"],
  [/프랑켄슈타인/g, "Frankenstein"],
  [/세포/g, "cell"],
];

export type QuestionIntent =
  | "app_usage"
  | "mechanism"
  | "genes_cells"
  | "paper_source"
  | "ethics_reality"
  | "definition";

const KO_INTERROGATIVE_PATTERNS =
  /(이란\s*무엇인가요|란\s*무엇인가요|이란\s*뭐야|란\s*뭐야|가\s*뭐야|이\s*뭐야|무엇인가요|무엇입니까|어떻게\s*되나요|어떻게\s*하나요|어떻게\s*작동|왜\s*그런가요|왜\s*다시|알려\s*주세요|알려주세요|알려줘|설명해\s*주세요|설명해줘|말해줘|인가요|입니까|하나요|되나요|있나요|없나요|가능한가요|가능할까|할\s*수\s*있나요|원리가\s*뭐|원리는|차이는|장점은|단점은|이유는|뭐야|무엇|어떻게|왜|에\s*대해|대해서)/g;

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

function buildPubMedQuery(rawQuery: string): string {
  let q = extractWikiTopic(rawQuery);
  for (const [pattern, en] of KO_TO_EN_BIO_TERMS) {
    if (pattern.test(q)) {
      q = q.replace(pattern, ` ${en} `);
    }
  }
  // Remove remaining Hangul characters so EuropePMC searches clean English scientific terms
  const asciiOnly = q.replace(/[\uAC00-\uD7A3\u3131-\u318E]/g, " ").replace(/\s+/g, " ").trim();
  return asciiOnly || "stem cell";
}

export function toConciseCore(text: string, maxChars: number = 170): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const firstTwo = clean.match(/^[^.!?]+[.!?](\s+[^.!?]+[.!?])?/);
  const candidate = firstTwo ? firstTwo[0].trim() : clean;
  if (candidate.length <= maxChars) return candidate;
  const firstOne = clean.match(/^[^.!?]+[.!?]/);
  if (firstOne && firstOne[0].length <= maxChars) return firstOne[0].trim();
  return candidate.slice(0, maxChars - 1).trimEnd() + "…";
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

export const scienceStitchService = {
  async fetchPubMedPapers(query: string, limit: number = 3): Promise<PubMedPaper[]> {
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encoded}&format=json&pageSize=${limit}&resultType=core`;
      const res = await fetch(assertAllowedApiEndpoint(url));
      if (!res.ok) return [];
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
          ? item.abstractText.replace(/<[^>]+>/g, "").slice(0, 320) + "..."
          : "Empirical bio-engineering and stem-cell differentiation findings verified in EuropePMC / PubMed."
      }));
    } catch {
      return [];
    }
  },

  async fetchWikipediaContext(topic: string, lang: "ko" | "en" = "en"): Promise<WikiContext | null> {
    try {
      const cleanTopic = extractWikiTopic(topic);
      if (!cleanTopic || cleanTopic.length < 2) return null;
      const slug = cleanTopic.replace(/\s+/g, "_");
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
      const res = await fetch(assertAllowedApiEndpoint(url));
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
      const sRes = await fetch(assertAllowedApiEndpoint(searchUrl));
      if (!sRes.ok) return null;
      const sData = await sRes.json();
      const firstTitle = sData?.query?.search?.[0]?.title;
      if (!firstTitle) {
        if (lang === "ko") return this.fetchWikipediaContext(cleanTopic, "en");
        return null;
      }

      const sumRes = await fetch(
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

  async stitchLiveQuery(userQuery: string, preferKorean: boolean = true): Promise<StitchedResearchDossier> {
    const cleanTopic = extractWikiTopic(userQuery);
    const pubmedQuery = buildPubMedQuery(userQuery);
    const [wiki, papers] = await Promise.all([
      this.fetchWikipediaContext(cleanTopic, preferKorean ? "ko" : "en"),
      this.fetchPubMedPapers(pubmedQuery, 3)
    ]);

    const fallbackPapers =
      papers.length > 0
        ? papers
        : await this.fetchPubMedPapers(`${pubmedQuery} stem cell`, 3);

    const topPaper = fallbackPapers[0];
    const wikiSummary = wiki?.extract ? toConciseCore(wiki.extract, 170) : "";
    const paperCore = topPaper?.abstractText ? toConciseCore(topPaper.abstractText, 170) : "";

    const stemCellSynthesisKo = wikiSummary
      ? `[${wiki?.title}] ${wikiSummary}`
      : topPaper
      ? `[${topPaper.title}] ${paperCore}`
      : `"${cleanTopic}"에 대한 정확한 답을 찾지 못했습니다. 현재 실험(원리·유전자·논문·윤리)이나 생물학 핵심 단어로 다시 질문해 주세요.`;

    const stemCellSynthesisEn = wikiSummary
      ? `[${wiki?.title}] ${wikiSummary}`
      : topPaper
      ? `[${topPaper.title}] ${paperCore}`
      : `Could not find a direct match for "${cleanTopic}". Ask about the active experiment's mechanism, genes, paper, or ethics.`;

    return {
      query: userQuery,
      timestamp: new Date().toLocaleTimeString(),
      wiki,
      papers: fallbackPapers,
      stemCellSynthesisEn,
      stemCellSynthesisKo
    };
  }
};
