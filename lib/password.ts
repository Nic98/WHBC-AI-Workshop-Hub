function base64ToBytes(value: string) {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left[index] ^ right[index];
  return result === 0;
}

export async function verifyPbkdf2Password(password: string, encodedHash: string) {
  const [algorithm, iterationsText, saltText, expectedText, extra] = encodedHash.split("$");
  const iterations = Number(iterationsText);
  const salt = base64ToBytes(saltText ?? "");
  const expected = base64ToBytes(expectedText ?? "");
  if (extra !== undefined || algorithm !== "pbkdf2-sha256" || !Number.isSafeInteger(iterations) || iterations < 210_000 || !salt?.byteLength || !expected?.byteLength) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", iterations, salt }, key, expected.byteLength * 8);
  return timingSafeEqual(new Uint8Array(bits), expected);
}
