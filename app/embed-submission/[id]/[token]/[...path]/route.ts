import { isSubmissionPreviewToken } from "@/lib/auth";
import { serveEmbeddedSubmissionFile } from "@/lib/embedded-submission";

export async function GET(request: Request, context: { params: Promise<{ id: string; token: string; path: string[] }> }) {
  const { id, token, path } = await context.params;
  return serveEmbeddedSubmissionFile(request, id, path, await isSubmissionPreviewToken(token, id));
}
