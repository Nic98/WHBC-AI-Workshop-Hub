import { env } from "cloudflare:workers";
export * from "./storage-validation";

export function projectObjectKey(projectId: string, versionId: string, path: string) {
  return `projects/${projectId}/versions/${versionId}/files/${path}`;
}

export function coverObjectKey(projectId: string, extension: string) {
  return `covers/${projectId}/${crypto.randomUUID()}.${extension}`;
}

export function getProjectBucket() {
  const bucket = (env as unknown as CloudflareEnv).PROJECTS;
  if (!bucket) throw new Error("Project storage is unavailable.");
  return bucket;
}

export async function deleteProjectObjects(projectId: string) {
  for (const prefix of [`projects/${projectId}/`, `covers/${projectId}/`]) {
    await deletePrefix(prefix);
  }
}

async function deletePrefix(prefix: string) {
  const bucket = getProjectBucket();
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    if (page.objects.length) await bucket.delete(page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

export async function deleteProjectVersionObjects(projectId: string, versionId: string) {
  await deletePrefix(`projects/${projectId}/versions/${versionId}/`);
}
