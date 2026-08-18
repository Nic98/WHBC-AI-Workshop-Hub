import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { contentTypeForPath, getProjectBucket, normalizeProjectPath, projectObjectKey } from "@/lib/storage";

export async function GET(request: Request, context: { params: Promise<{ projectId: string; versionId: string; path: string[] }> }) {
  const { projectId, versionId, path: pathParts } = await context.params;
  const path = normalizeProjectPath(pathParts.join("/"));
  if (!path) return new Response("Not found", { status: 404 });
  const [project] = await getDb().select().from(projects).where(eq(projects.id, projectId)).limit(1);
  const isPublicVersion = project?.status === "published" && project.currentVersionId === versionId;
  if (!project || (!isPublicVersion && !(await isAdminRequest(request)))) return new Response("Not found", { status: 404 });
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
    headers.set(
      "content-security-policy",
      "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; style-src * data: blob: 'unsafe-inline'; img-src * data: blob:; font-src * data:; media-src * data: blob:; connect-src *; frame-src https:; object-src 'none'; base-uri 'self'; form-action *; frame-ancestors 'self'; sandbox allow-scripts allow-forms allow-downloads allow-modals",
    );
  }
  return new Response(object.body, { headers });
}
