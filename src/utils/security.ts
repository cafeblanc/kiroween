/**
 * Input sanitization helpers (design.md, Security Considerations: XSS Prevention).
 * Contains no rate-limiting logic.
 */

export const FALLBACK_VIDEO_URL = "/videos/fallback.mp4";

const SAFE_ABSOLUTE_PROTOCOLS = new Set(["https:", "http:", "blob:"]);
// Control chars and whitespace that browsers strip inside URLs (used to hide "java\tscript:").
// eslint-disable-next-line no-control-regex
const CONTROL_OR_SPACE = /[\u0000-\u0020\u007f-\u009f]/g;

/**
 * Returns a URL that is safe to assign to a media `src`, or null if rejected.
 * Allowed: http:, https:, blob:, and same-origin relative paths ("/x", "./x", "x/y").
 * Rejected: javascript:, data:, vbscript:, protocol-relative ("//host"), backslash tricks.
 */
export function sanitizeVideoUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const url = input.trim();
  if (!url) return null;

  const probe = url.replace(CONTROL_OR_SPACE, "");
  if (!probe || probe.includes("\\")) return null;
  // Protocol-relative URLs escape the origin.
  if (probe.startsWith("//")) return null;

  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(probe);
  if (scheme) {
    const protocol = `${scheme[1].toLowerCase()}:`;
    if (!SAFE_ABSOLUTE_PROTOCOLS.has(protocol)) return null;
    // Reject the original if whitespace/control chars were hidden inside the scheme.
    if (probe !== url && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return null;
    return url;
  }

  // No scheme: a relative path. A ':' before the first '/', '?' or '#' would be a scheme.
  const firstDelim = probe.search(/[/?#]/);
  const head = firstDelim === -1 ? probe : probe.slice(0, firstDelim);
  if (head.includes(":")) return null;
  return url;
}

/** Sanitized URL, or `fallback` (default /videos/fallback.mp4) when rejected. */
export function safeVideoUrl(input: unknown, fallback: string = FALLBACK_VIDEO_URL): string {
  return sanitizeVideoUrl(input) ?? fallback;
}

/** Allowlist of known API hosts and the path prefixes callable on each. "" host = same origin. */
export const API_ALLOWLIST: Readonly<Record<string, readonly string[]>> = {
  "": ["/api/generate-video", "/sounds/", "/images/", "/videos/"],
  "api-inference.huggingface.co": ["/models/"],
  "router.huggingface.co": ["/"],
  "image.pollinations.ai": ["/prompt/"],
  "www.ebi.ac.uk": ["/europepmc/webservices/rest/"],
  "en.wikipedia.org": ["/api/rest_v1/", "/w/api.php"],
  "ko.wikipedia.org": ["/api/rest_v1/", "/w/api.php"],
  "translate.googleapis.com": ["/translate_a/"],
};

/** True when the endpoint is https and its host+path appear in the allowlist (or is same-origin allowlisted path). */
export function isAllowedApiEndpoint(
  endpoint: unknown,
  allowlist: Readonly<Record<string, readonly string[]>> = API_ALLOWLIST,
): boolean {
  if (typeof endpoint !== "string" || !endpoint.trim()) return false;
  const raw = endpoint.trim();
  if (/[\u0000-\u001f\u007f\\]/.test(raw) || raw.startsWith("//")) return false;

  let host = "";
  let pathname: string;
  if (raw.startsWith("/")) {
    try {
      pathname = new URL(raw, "http://same-origin.invalid").pathname;
    } catch {
      return false;
    }
  } else {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return false;
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
    host = parsed.hostname.toLowerCase();
    pathname = parsed.pathname;
  }

  // Block path traversal after normalization differences.
  if (pathname.split("/").includes("..")) return false;
  const prefixes = allowlist[host];
  if (!prefixes) return false;
  return prefixes.some((p) => pathname.startsWith(p));
}

/** Throws when the endpoint is not allowlisted. Call before every network request. */
export function assertAllowedApiEndpoint(endpoint: string): string {
  if (!isAllowedApiEndpoint(endpoint)) {
    throw new Error(`Blocked request to non-allowlisted endpoint: ${String(endpoint).slice(0, 120)}`);
  }
  return endpoint;
}
