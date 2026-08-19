export const MAX_ZIP_BYTES = 25 * 1024 * 1024;
export const MAX_EXPANDED_BYTES = 100 * 1024 * 1024;
export const MAX_PROJECT_FILES = 1000;
export const MAX_SINGLE_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_COVER_BYTES = 10 * 1024 * 1024;

const blockedExtensions = new Set(["exe", "dll", "dmg", "app", "sh", "bash", "bat", "cmd", "ps1", "php", "py", "rb", "jar"]);

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
  if (
    !normalized || normalized.startsWith("/") || normalized.includes("\0") || normalized.length > 240 ||
    segments.some((segment) => !segment || segment === "." || segment === "..") ||
    segments[0] === "__MACOSX" || normalized.endsWith("/.DS_Store")
  ) return null;
  const extension = normalized.includes(".") ? normalized.split(".").pop()!.toLowerCase() : "";
  if (blockedExtensions.has(extension)) return null;
  return normalized;
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
