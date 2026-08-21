import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";
import { isLocalPreviewHostname, localPreviewOrigin } from "@/lib/local-preview-origin";
import { contentTypeForPath, getProjectBucket, normalizeProjectPath } from "@/lib/storage";
import { submissionFileKey } from "@/lib/submission-storage";

export async function serveEmbeddedSubmissionFile(request: Request, submissionId: string, pathParts: string[], previewAuthorized: boolean) {
  if (!previewAuthorized) return new Response("Not found", { status: 404 });
  const path = normalizeProjectPath(pathParts.join("/"));
  if (!path) return new Response("Not found", { status: 404 });
  const [submission] = await getDb().select({ status: submissions.status }).from(submissions).where(eq(submissions.id, submissionId)).limit(1);
  if (!submission || submission.status === "uploading") return new Response("Not found", { status: 404 });
  const object = await getProjectBucket().get(submissionFileKey(submissionId, path));
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", object.httpMetadata?.contentType || contentTypeForPath(path));
  headers.set("cache-control", "private, no-store");
  headers.set("etag", object.httpEtag);
  headers.set("access-control-allow-origin", "*");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  if (path.toLowerCase().endsWith(".html")) {
    const requestUrl = new URL(request.url);
    const isolatedLocal = isLocalPreviewHostname(requestUrl.hostname);
    const localParent = isolatedLocal ? localPreviewOrigin(requestUrl.host, requestUrl.protocol) : null;
    const sandbox = `sandbox allow-scripts allow-forms allow-downloads allow-modals${isolatedLocal ? " allow-same-origin" : ""}`;
    const frameAncestors = `frame-ancestors 'self'${localParent ? ` ${localParent}` : ""}`;
    headers.set("content-security-policy", `default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; style-src * data: blob: 'unsafe-inline'; img-src * data: blob:; font-src * data:; media-src * data: blob:; connect-src *; frame-src https:; object-src 'none'; base-uri 'self'; form-action *; ${frameAncestors}; ${sandbox}`);
  }
  return new Response(object.body, { headers });
}
