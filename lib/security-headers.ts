import { localPreviewOrigin } from "./local-preview-origin.ts";

export function siteContentSecurityPolicy(requestUrl: string) {
  const url = new URL(requestUrl);
  const isolatedLocalPreview = localPreviewOrigin(url.host, url.protocol);
  const frameSources = `'self' https:${isolatedLocalPreview ? " http:" : ""}`;
  return `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; frame-src ${frameSources}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
}
