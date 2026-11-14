import { describe, expect, it } from "vitest";
import {
  FALLBACK_VIDEO_URL,
  assertAllowedApiEndpoint,
  isAllowedApiEndpoint,
  safeVideoUrl,
  sanitizeVideoUrl,
} from "./security";

describe("sanitizeVideoUrl", () => {
  it.each([
    "https://cdn.example.com/a.mp4",
    "http://localhost:5173/a.mp4",
    "blob:http://localhost/abc-123",
    "/videos/a.mp4",
    "videos/a.mp4",
    "./a.mp4?x=a:b",
  ])("allows %s", (u) => expect(sanitizeVideoUrl(u)).toBe(u));

  it.each([
    "javascript:alert(1)",
    "  JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:x",
    "//evil.com/a.mp4",
    "\\\\evil.com\\a.mp4",
    "",
    "   ",
    null,
    undefined,
    42,
  ])("rejects %s", (u) => expect(sanitizeVideoUrl(u)).toBeNull());

  it("falls back to /videos/fallback.mp4", () => {
    expect(safeVideoUrl("javascript:alert(1)")).toBe(FALLBACK_VIDEO_URL);
    expect(FALLBACK_VIDEO_URL).toBe("/videos/fallback.mp4");
    expect(safeVideoUrl("/videos/ok.mp4")).toBe("/videos/ok.mp4");
  });
});

describe("isAllowedApiEndpoint", () => {
  it("allows known endpoints", () => {
    expect(isAllowedApiEndpoint("/api/generate-video")).toBe(true);
    expect(isAllowedApiEndpoint("https://api-inference.huggingface.co/models/Lightricks/LTX-Video")).toBe(true);
    expect(isAllowedApiEndpoint("https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=x")).toBe(true);
    expect(isAllowedApiEndpoint("https://en.wikipedia.org/api/rest_v1/page/summary/Foo")).toBe(true);
  });

  it("rejects unknown hosts, paths, protocols and tricks", () => {
    expect(isAllowedApiEndpoint("https://evil.com/api/generate-video")).toBe(false);
    expect(isAllowedApiEndpoint("http://www.ebi.ac.uk/europepmc/webservices/rest/")).toBe(false);
    expect(isAllowedApiEndpoint("/api/other")).toBe(false);
    expect(isAllowedApiEndpoint("//evil.com/api/generate-video")).toBe(false);
    expect(isAllowedApiEndpoint("https://user@www.ebi.ac.uk/europepmc/webservices/rest/")).toBe(false);
    expect(isAllowedApiEndpoint("javascript:alert(1)")).toBe(false);
    expect(isAllowedApiEndpoint("")).toBe(false);
    expect(() => assertAllowedApiEndpoint("https://evil.com/x")).toThrow();
  });
});
