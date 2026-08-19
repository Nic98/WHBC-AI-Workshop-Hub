export function localPreviewOrigin(host: string, protocol: string) {
  let url: URL;
  try {
    url = new URL(`${protocol.replace(/:$/, "")}://${host}`);
  } catch {
    return null;
  }
  if (url.hostname === "localhost") url.hostname = "[::1]";
  else if (url.hostname === "127.0.0.1" || url.hostname === "[::1]") url.hostname = "localhost";
  else return null;
  return url.origin;
}

export function isLocalPreviewHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
