import { beforeEach, describe, expect, it } from "vitest";
import { keywordDbService } from "./keywordDbService";

describe("keywordDbService", () => {
  beforeEach(() => {
    keywordDbService.resetForTests();
  });

  it("loads initial biomedical keywords from seed JSON", () => {
    const entries = keywordDbService.listAll();
    expect(entries.length).toBeGreaterThanOrEqual(20);
    expect(keywordDbService.resolveEnglishQuery("유령 심장 원리")).toContain(
      "decellularized bioartificial heart",
    );
  });

  it("saves new unknown keywords and prepares them for future lookups", () => {
    expect(keywordDbService.findBestMatch("인공혈액")).toBeNull();

    const saved = keywordDbService.upsertKeyword({
      keywordKo: "인공혈액",
      queryEn: "artificial blood stem cell",
      wikiTitle: "인공혈액",
      wikiExtract: "줄기세포 기반 적혈구 배양 기술",
      pmid: "99999999",
    });

    expect(saved.hitCount).toBe(1);
    const match = keywordDbService.findBestMatch("인공혈액 연구 현황");
    expect(match?.queryEn).toBe("artificial blood stem cell");
    expect(match?.wikiExtract).toBe("줄기세포 기반 적혈구 배양 기술");
    expect(keywordDbService.resolveEnglishQuery("인공혈액")).toBe(
      "artificial blood stem cell",
    );
  });

  it("increments hitCount when updating an existing keyword", () => {
    keywordDbService.upsertKeyword({
      keywordKo: "미토콘드리아",
      queryEn: "mitochondria",
    });
    const second = keywordDbService.upsertKeyword({
      keywordKo: "미토콘드리아",
      queryEn: "mitochondria",
      wikiTitle: "미토콘드리아",
    });
    expect(second.hitCount).toBe(2);
    expect(second.wikiTitle).toBe("미토콘드리아");
  });
});
