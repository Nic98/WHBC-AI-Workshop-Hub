const PREVIEW_TOKEN_TTL_MS = 60 * 60 * 1000;

function tokenPayload(projectId: string, versionId: string, expiresAt: number) {
  return `ai-workshop-preview-v1\n${projectId}\n${versionId}\n${expiresAt}`;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function signingKey(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usage);
}

export async function createProjectPreviewToken(secret: string, projectId: string, versionId: string, now = Date.now()) {
  const expiresAt = now + PREVIEW_TOKEN_TTL_MS;
  const key = await signingKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(tokenPayload(projectId, versionId, expiresAt)));
  return `${expiresAt}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyProjectPreviewToken(secret: string, token: string, projectId: string, versionId: string, now = Date.now()) {
  const [expiresText, signatureText, extra] = token.split(".");
  const expiresAt = Number(expiresText);
  const signature = base64UrlToBytes(signatureText ?? "");
  if (extra !== undefined || !Number.isSafeInteger(expiresAt) || expiresAt <= now || !signature?.byteLength) return false;
  const key = await signingKey(secret, ["verify"]);
  return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(tokenPayload(projectId, versionId, expiresAt)));
}
