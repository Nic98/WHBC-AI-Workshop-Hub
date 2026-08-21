import { getProjectBucket, contentTypeForPath } from "@/lib/storage";
import { submissionFileKey } from "@/lib/submission-storage";
import { authorizeSubmissionUpload } from "@/lib/submissions";
import { ManifestFile, normalizeProjectPath, unsafeProjectContentReason } from "@/lib/storage-validation";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const submission = await authorizeSubmissionUpload(request, id);
  if (!submission) return Response.json({ error: "This upload session is unavailable or has expired." }, { status: 401 });
  const path = normalizeProjectPath(new URL(request.url).searchParams.get("path") ?? "");
  if (!path) return Response.json({ error: "The file path is invalid." }, { status: 400 });
  const manifest = JSON.parse(submission.manifestJson) as ManifestFile[];
  const expected = manifest.find((file) => file.path === path);
  if (!expected) return Response.json({ error: "This file is not part of the approved upload list." }, { status: 400 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength !== expected.size) return Response.json({ error: `The uploaded size for ${path} does not match the project manifest.` }, { status: 400 });
  const unsafeReason = unsafeProjectContentReason(path, bytes);
  if (unsafeReason) return Response.json({ error: unsafeReason }, { status: 400 });
  await getProjectBucket().put(submissionFileKey(id, path), bytes, { httpMetadata: { contentType: contentTypeForPath(path), cacheControl: "private, no-store" } });
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
