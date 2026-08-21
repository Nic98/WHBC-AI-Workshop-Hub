export const MAX_ZIP_BYTES = 25 * 1024 * 1024;
export const MAX_EXPANDED_BYTES = 100 * 1024 * 1024;
export const MAX_PROJECT_FILES = 1000;
export const MAX_SINGLE_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_COVER_BYTES = 10 * 1024 * 1024;

const blockedExtensions = new Set(["exe", "dll", "dmg", "app", "sh", "bash", "bat", "cmd", "ps1", "php", "py", "rb", "jar"]);
const blockedSensitiveExtensions = new Set(["pem", "key", "p12", "pfx", "sqlite", "sqlite3"]);
const blockedPathSegments = new Set([".git", ".svn", ".hg", "node_modules"]);
const blockedSensitiveNames = new Set([".env", ".env.local", ".env.production", "id_rsa", "id_ed25519", "credentials.json", "service-account.json"]);

export type ManifestFile = { path: string; size: number; type?: string };

export function isIgnorableArchiveMetadata(input: string) {
  const normalized = input.replaceAll("\\", "/");
  const segments = normalized.split("/").filter(Boolean);
  const basename = segments.at(-1) ?? "";
  return segments.includes("__MACOSX") || basename === ".DS_Store" || basename.startsWith("._");
}

export function normalizeProjectPath(input: string) {
  const normalized = input.replaceAll("\\", "/").replace(/^\.\//, "");
  const segments = normalized.split("/");
  const lowerSegments = segments.map((segment) => segment.toLowerCase());
  const basename = lowerSegments.at(-1) ?? "";
  if (
    !normalized || normalized.startsWith("/") || normalized.includes("\0") || normalized.length > 240 ||
    segments.some((segment) => !segment || segment === "." || segment === "..") ||
    lowerSegments.some((segment) => blockedPathSegments.has(segment)) ||
    blockedSensitiveNames.has(basename) || basename.startsWith(".env.") ||
    segments[0] === "__MACOSX" || normalized.endsWith("/.DS_Store")
  ) return null;
  const extension = normalized.includes(".") ? normalized.split(".").pop()!.toLowerCase() : "";
  if (blockedExtensions.has(extension) || blockedSensitiveExtensions.has(extension)) return null;
  return normalized;
}

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
];

export function unsafeProjectContentReason(path: string, bytes: Uint8Array) {
  if (bytes.byteLength > 2 * 1024 * 1024) return null;
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (!["html", "htm", "js", "mjs", "css", "json", "txt", "xml", "md"].includes(extension)) return null;
  const text = new TextDecoder().decode(bytes);
  if (secretPatterns.some((pattern) => pattern.test(text))) {
    return `The file ${path} appears to contain a private key or API credential. Remove secrets before submitting.`;
  }
  return null;
}

export type SupportedCoverType = "image/png" | "image/jpeg" | "image/webp" | "image/avif";

export function detectCoverType(bytes: Uint8Array): SupportedCoverType | null {
  if (bytes.byteLength >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.byteLength >= 12 && new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP") return "image/webp";
  if (bytes.byteLength >= 12 && new TextDecoder().decode(bytes.subarray(4, 8)) === "ftyp") {
    const brand = new TextDecoder().decode(bytes.subarray(8, Math.min(bytes.byteLength, 32)));
    if (brand.includes("avif") || brand.includes("avis")) return "image/avif";
  }
  return null;
}

export function validateCoverBytes(bytes: Uint8Array) {
  if (!bytes.byteLength || bytes.byteLength > MAX_COVER_BYTES) return { error: "Cover images must be between 1 byte and 10 MB." } as const;
  const type = detectCoverType(bytes);
  if (!type) return { error: "Choose a valid PNG, JPEG, WebP, or AVIF cover image." } as const;
  const extension = type === "image/png" ? "png" : type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "avif";
  return { type, extension } as const;
}

export function validateManifest(input: unknown) {
  if (!Array.isArray(input) || input.length === 0) return { error: "The project contains no files." } as const;
  if (input.length > MAX_PROJECT_FILES) return { error: `Projects may contain at most ${MAX_PROJECT_FILES} files.` } as const;
  const files: ManifestFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;
  for (const item of input) {
    const value = item as Partial<ManifestFile>;
    const path = typeof value.path === "string" ? normalizeProjectPath(value.path) : null;
    const size = Number(value.size);
    if (!path) return { error: "One or more file paths are unsafe or unsupported." } as const;
    if (seen.has(path)) return { error: `The project contains a duplicate file: ${path}` } as const;
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_SINGLE_FILE_BYTES) return { error: `The file ${path} is too large or has an invalid size.` } as const;
    seen.add(path);
    totalBytes += size;
    files.push({ path, size, type: typeof value.type === "string" ? value.type.slice(0, 120) : undefined });
  }
  if (totalBytes > MAX_EXPANDED_BYTES) return { error: "The expanded project is larger than 100 MB." } as const;
  if (!seen.has("index.html")) return { error: "The project must contain index.html at its top level." } as const;
  return { files, totalBytes } as const;
}

const mimeTypes: Record<string, string> = {
  html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8", txt: "text/plain; charset=utf-8", xml: "application/xml; charset=utf-8", svg: "image/svg+xml",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", ico: "image/x-icon",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", mp4: "video/mp4", webm: "video/webm",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", wasm: "application/wasm", pdf: "application/pdf",
};

export function contentTypeForPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return mimeTypes[extension] ?? "application/octet-stream";
}
