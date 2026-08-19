import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { isLocalPreviewHostname, localPreviewOrigin } from "@/lib/local-preview-origin";
import { contentTypeForPath, getProjectBucket, normalizeProjectPath, projectObjectKey } from "@/lib/storage";

type EmbeddedProjectRequest = {
  projectId: string;
  versionId: string;
  pathParts: string[];
  previewAuthorized?: boolean;
};

export async function serveEmbeddedProjectFile(request: Request, input: EmbeddedProjectRequest) {
  const { projectId, versionId, pathParts, previewAuthorized = false } = input;
  const path = normalizeProjectPath(pathParts.join("/"));
  if (!path) return new Response("Not found", { status: 404 });
  const [project] = await getDb().select().from(projects).where(eq(projects.id, projectId)).limit(1);
  const isPublicVersion = project?.status === "published" && project.currentVersionId === versionId;
  const isPreviewVersion = previewAuthorized && (project?.draftVersionId === versionId || project?.currentVersionId === versionId);
  if (!project || (!isPublicVersion && !isPreviewVersion && !(await isAdminRequest(request)))) return new Response("Not found", { status: 404 });
  const object = await getProjectBucket().get(projectObjectKey(projectId, versionId, path));
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", object.httpMetadata?.contentType || contentTypeForPath(path));
  headers.set("cache-control", isPublicVersion ? "public, max-age=31536000, immutable" : "private, no-store");
  headers.set("etag", object.httpEtag);
  headers.set("access-control-allow-origin", "*");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  if (path.toLowerCase().endsWith(".html")) {
    const requestUrl = new URL(request.url);
    const usesIsolatedLocalOrigin = previewAuthorized && isLocalPreviewHostname(requestUrl.hostname);
    const localParent = usesIsolatedLocalOrigin ? localPreviewOrigin(requestUrl.host, requestUrl.protocol) : null;
    const sandbox = `sandbox allow-scripts allow-forms allow-downloads allow-modals${usesIsolatedLocalOrigin ? " allow-same-origin" : ""}`;
    const frameAncestors = `frame-ancestors 'self'${localParent ? ` ${localParent}` : ""}`;
    headers.set(
      "content-security-policy",
      `default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; style-src * data: blob: 'unsafe-inline'; img-src * data: blob:; font-src * data:; media-src * data: blob:; connect-src *; frame-src https:; object-src 'none'; base-uri 'self'; form-action *; ${frameAncestors}; ${sandbox}`,
    );
  }
  return new Response(object.body, { headers });
}
