import { unzipSync } from "fflate";
import { MAX_EXPANDED_BYTES, MAX_PROJECT_FILES, MAX_SINGLE_FILE_BYTES, MAX_ZIP_BYTES, normalizeProjectPath } from "./storage-validation.ts";

export type PreparedProjectFile = { path: string; bytes: Uint8Array; type: string };

function zipError(message: string): never {
  throw new Error(message);
}

function inspectZipDirectory(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_ZIP_BYTES) zipError("ZIP projects must be 25 MB or smaller.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumEocdOffset = Math.max(0, bytes.byteLength - 65_557);
  let eocd = -1;
  for (let offset = bytes.byteLength - 22; offset >= minimumEocdOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) zipError("This ZIP file is incomplete or unsupported.");
  const disk = view.getUint16(eocd + 4, true);
  const centralDisk = view.getUint16(eocd + 6, true);
  const entries = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (disk || centralDisk || entries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) zipError("Multi-part and ZIP64 projects are not supported.");
  if (!entries || entries > MAX_PROJECT_FILES) zipError(`Projects may contain at most ${MAX_PROJECT_FILES} files.`);
  if (centralOffset + centralSize > bytes.byteLength) zipError("This ZIP file is incomplete or unsupported.");

  const decoder = new TextDecoder();
  let offset = centralOffset;
  let expandedBytes = 0;
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== 0x02014b50) zipError("This ZIP file has an invalid directory.");
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (nextOffset > bytes.byteLength) zipError("This ZIP file has an invalid directory.");
    if (flags & 1) zipError("Password-protected ZIP projects are not supported.");
    if (method !== 0 && method !== 8) zipError("This ZIP uses an unsupported compression method.");
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)).replaceAll("\\", "/");
    if (!name.endsWith("/") && !normalizeProjectPath(name)) zipError("One or more ZIP paths are unsafe or unsupported.");
    if (uncompressedSize > MAX_SINGLE_FILE_BYTES) zipError(`The file ${name || "inside the ZIP"} is larger than 50 MB.`);
    expandedBytes += uncompressedSize;
    if (expandedBytes > MAX_EXPANDED_BYTES) zipError("The expanded project is larger than 100 MB.");
    offset = nextOffset;
  }
}

export function prepareProjectBytes(filename: string, bytes: Uint8Array): PreparedProjectFile[] {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith(".html")) {
    if (!bytes.byteLength || bytes.byteLength > MAX_SINGLE_FILE_BYTES) throw new Error("HTML projects must be non-empty and no larger than 50 MB.");
    return [{ path: "index.html", bytes, type: "text/html" }];
  }
  if (!lowerName.endsWith(".zip")) throw new Error("Choose a single HTML file or a ZIP project.");

  inspectZipDirectory(bytes);
  let archive: Record<string, Uint8Array>;
  try { archive = unzipSync(bytes); }
  catch { throw new Error("This ZIP file could not be opened. Export it again and retry."); }
  let entries = Object.entries(archive).filter(([path]) => !path.endsWith("/") && !path.includes("__MACOSX/") && !path.endsWith(".DS_Store"));
  const indexCandidates = entries.map(([path]) => path.replaceAll("\\", "/")).filter((path) => path === "index.html" || path.endsWith("/index.html")).sort((a, b) => a.length - b.length);
  if (!indexCandidates.length) throw new Error("No index.html file was found in this ZIP project.");
  const root = indexCandidates[0].slice(0, -"index.html".length);
  if (root && entries.every(([path]) => path.replaceAll("\\", "/").startsWith(root))) {
    entries = entries.map(([path, content]) => [path.replaceAll("\\", "/").slice(root.length), content]);
  }

  const files: PreparedProjectFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;
  for (const [rawPath, content] of entries) {
    const path = normalizeProjectPath(rawPath.replaceAll("\\", "/"));
    if (!path) throw new Error("One or more ZIP paths are unsafe or unsupported.");
    if (seen.has(path)) throw new Error(`The ZIP contains a duplicate file: ${path}`);
    seen.add(path);
    totalBytes += content.byteLength;
    if (content.byteLength > MAX_SINGLE_FILE_BYTES || totalBytes > MAX_EXPANDED_BYTES) throw new Error("The expanded project is larger than the allowed limit.");
    files.push({ path, bytes: content, type: path.endsWith(".html") ? "text/html" : "" });
  }
  if (!seen.has("index.html")) throw new Error("The project must contain index.html at its top level.");
  if (files.length > MAX_PROJECT_FILES) throw new Error(`Projects may contain at most ${MAX_PROJECT_FILES} files.`);
  return files;
}

export async function prepareProjectFile(file: File) {
  return prepareProjectBytes(file.name, new Uint8Array(await file.arrayBuffer()));
}
