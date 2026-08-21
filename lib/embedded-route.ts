export function isEmbeddedProjectPath(pathname: string) {
  return pathname.startsWith("/embed/") || pathname.startsWith("/embed-preview/") || pathname.startsWith("/embed-submission/");
}
