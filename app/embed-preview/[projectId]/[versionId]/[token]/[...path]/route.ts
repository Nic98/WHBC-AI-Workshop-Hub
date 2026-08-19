import { isProjectPreviewToken } from "@/lib/auth";
import { serveEmbeddedProjectFile } from "@/lib/embedded-project";

export async function GET(request: Request, context: { params: Promise<{ projectId: string; versionId: string; token: string; path: string[] }> }) {
  const { projectId, versionId, token, path: pathParts } = await context.params;
  if (!(await isProjectPreviewToken(token, projectId, versionId))) return new Response("Not found", { status: 404 });
  return serveEmbeddedProjectFile(request, { projectId, versionId, pathParts, previewAuthorized: true });
}
