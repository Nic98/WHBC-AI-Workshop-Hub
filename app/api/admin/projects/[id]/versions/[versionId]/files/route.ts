import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projectVersions } from "@/db/schema";
import { assertSameOrigin, isAdminRequest } from "@/lib/auth";
import { contentTypeForPath, getProjectBucket, ManifestFile, normalizeProjectPath, projectObjectKey } from "@/lib/storage";

export async function PUT(request: Request, context: { params: Promise<{ id: string; versionId: string }> }) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This request was rejected." }, { status: 403 });
  if (!(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id, versionId } = await context.params;
  const path = normalizeProjectPath(new URL(request.url).searchParams.get("path") ?? "");
  if (!path) return Response.json({ error: "The file path is invalid." }, { status: 400 });
  const [version] = await getDb().select().from(projectVersions).where(and(eq(projectVersions.id, versionId), eq(projectVersions.projectId, id))).limit(1);
  if (!version || version.state !== "staging") return Response.json({ error: "This upload is no longer available." }, { status: 404 });
  const manifest = JSON.parse(version.manifestJson) as ManifestFile[];
  const expected = manifest.find((file) => file.path === path);
  if (!expected) return Response.json({ error: "This file is not part of the approved project manifest." }, { status: 400 });
  const body = await request.arrayBuffer();
  if (body.byteLength !== expected.size) return Response.json({ error: `The uploaded size for ${path} does not match the project manifest.` }, { status: 400 });
  await getProjectBucket().put(projectObjectKey(id, versionId, path), body, { httpMetadata: { contentType: expected.type || contentTypeForPath(path) } });
  return Response.json({ ok: true });
}
