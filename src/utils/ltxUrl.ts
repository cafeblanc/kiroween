/**
 * Shared (server + browser) helpers for the LTX video API.
 * Docs: https://docs.ltx.io/async-jobs.md (job ids / result URLs), https://docs.ltx.io/input-formats.md.
 */

/** Strict job-id format. Upstream ids are hex strings; this also blocks path traversal / query injection. */
export const LTX_JOB_ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidLtxJobId(id: unknown): id is string {
  return typeof id === "string" && LTX_JOB_ID_REGEX.test(id);
}

/**
 * Accepts a finished LTX job's `result.video_url`.
 * The URL comes from the authenticated LTX API response (fetched server-side with our key), and the docs only show
 * an example host (https://docs.ltx.io/async-jobs.md "Result format"). A fixed host allowlist rejected real results,
 * so any plain https URL is accepted; credentials, non-default ports and control characters are still rejected.
 */
export function isTrustedLtxVideoUrl(input: unknown): input is string {
  if (typeof input !== "string") return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0020\u007f-\u009f\\]/.test(input)) return false;
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  return u.hostname.length > 0;
}

/**
 * The only origin the chunked download proxy may fetch from: LTX's result bucket on Google Cloud Storage
 * (observed in production: https://storage.googleapis.com/ltxv-api-ephemeral-prd/model-serving/outputs/...).
 * The bucket sends no CORS headers, so the browser cannot download results directly. A strict prefix keeps the
 * proxy from becoming an open relay.
 */
export const LTX_RESULT_HOST = "storage.googleapis.com";
export const LTX_RESULT_BUCKET_PREFIX = "/ltxv-api-ephemeral-prd/";

export function isLtxProxyDownloadUrl(input: unknown): input is string {
  if (!isTrustedLtxVideoUrl(input)) return false;
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return false;
  }
  if (u.port) return false;
  if (u.hostname.toLowerCase() !== LTX_RESULT_HOST) return false;
  // Reject dot segments and encoded slashes that could escape the bucket prefix.
  if (/(^|\/)\.\.?(\/|$)|%2f|%5c/i.test(u.pathname)) return false;
  return u.pathname.startsWith(LTX_RESULT_BUCKET_PREFIX) && u.pathname.length > LTX_RESULT_BUCKET_PREFIX.length;
}
