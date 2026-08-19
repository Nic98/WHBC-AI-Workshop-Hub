import { serveEmbeddedProjectFile } from "@/lib/embedded-project";

export async function GET(request: Request, context: { params: Promise<{ projectId: string; versionId: string; path: string[] }> }) {
  const { projectId, versionId, path: pathParts } = await context.params;
  return serveEmbeddedProjectFile(request, { projectId, versionId, pathParts });
}
