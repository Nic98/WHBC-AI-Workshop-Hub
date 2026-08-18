const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home", ".lan", ".test", ".invalid", ".example"];
const MAX_HTML_INSPECTION_BYTES = 256 * 1024;
const MAX_EXTERNAL_IMAGE_BYTES = 10 * 1024 * 1024;

export type ExternalInspection = {
  url: string;
  embedMode: "embedded" | "external";
  ogImageUrl: string | null;
};

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

export function isPrivateHostname(input: string) {
  const hostname = input.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || !hostname.includes(".")) return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return true;
  if (isPrivateIpv4(hostname)) return true;
  if (hostname.includes(":")) {
    const compact = hostname.replace(/^0+(?=:)/, "");
    if (compact === "::" || compact === "::1" || /^(fc|fd|fe[89ab])/i.test(compact)) return true;
    const mapped = compact.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
    if (mapped && isPrivateIpv4(mapped)) return true;
  }
  return false;
}

export function validateExternalProjectUrl(input: string) {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password || url.port || isPrivateHostname(url.hostname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function frameBlockedByHeaders(headers: Headers) {
  const xFrameOptions = headers.get("x-frame-options")?.toLowerCase() ?? "";
  if (/(^|,|\s)(deny|sameorigin)(,|\s|$)/.test(xFrameOptions)) return true;
  const csp = headers.get("content-security-policy")?.toLowerCase() ?? "";
  const frameAncestors = csp.match(/(?:^|;)\s*frame-ancestors\s+([^;]+)/)?.[1] ?? "";
  return frameAncestors.includes("'none'") || frameAncestors.includes("'self'");
}

async function safeFetch(url: string, init: RequestInit, redirects = 0): Promise<{ response: Response; url: string }> {
  if (redirects > 4) throw new Error("Too many redirects");
  const safeUrl = validateExternalProjectUrl(url);
  if (!safeUrl) throw new Error("Unsafe external URL");
  const response = await fetch(safeUrl, { ...init, redirect: "manual", signal: AbortSignal.timeout(6_000) });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("Invalid redirect");
    await response.body?.cancel().catch(() => undefined);
    return safeFetch(new URL(location, safeUrl).toString(), init, redirects + 1);
  }
  return { response, url: safeUrl };
}

async function readPrefix(response: Response, limit: number) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = limit - total;
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    chunks.push(chunk);
    total += chunk.byteLength;
    if (value.byteLength > remaining) break;
  }
  await reader.cancel().catch(() => undefined);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(merged);
}

function findOgImage(html: string, pageUrl: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const property = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (property !== "og:image" && property !== "twitter:image") continue;
    const content = tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!content) continue;
    const candidate = validateExternalProjectUrl(new URL(content, pageUrl).toString());
    if (candidate) return candidate;
  }
  return null;
}

export async function inspectExternalProjectUrl(input: string): Promise<ExternalInspection> {
  const normalized = validateExternalProjectUrl(input);
  if (!normalized) throw new Error("External projects require a public HTTPS address.");
  try {
    const { response, url } = await safeFetch(normalized, {
      method: "GET",
      headers: { accept: "text/html,application/xhtml+xml", range: `bytes=0-${MAX_HTML_INSPECTION_BYTES - 1}` },
    });
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const embedMode = response.ok && !frameBlockedByHeaders(response.headers) ? "embedded" : "external";
    const html = contentType.includes("text/html") || contentType.includes("application/xhtml+xml")
      ? await readPrefix(response, MAX_HTML_INSPECTION_BYTES)
      : "";
    return { url, embedMode, ogImageUrl: html ? findOgImage(html, url) : null };
  } catch {
    return { url: normalized, embedMode: "external", ogImageUrl: null };
  }
}

export async function fetchExternalImage(input: string) {
  const { response } = await safeFetch(input, { method: "GET", headers: { accept: "image/avif,image/webp,image/png,image/jpeg" } });
  const type = response.headers.get("content-type")?.split(";")[0]?.toLowerCase() ?? "";
  const extension = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"], ["image/avif", "avif"]]).get(type);
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (!response.ok || !extension || declared > MAX_EXTERNAL_IMAGE_BYTES) return null;
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_EXTERNAL_IMAGE_BYTES) { await reader.cancel().catch(() => undefined); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (!bytes.byteLength) return null;
  return { bytes, type, extension };
}
