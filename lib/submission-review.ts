import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, projectVersions, submissions } from "@/db/schema";
import { uniqueSlug } from "@/lib/catalog";
import { inspectExternalProjectUrl } from "@/lib/external";
import { coverObjectKey, deleteProjectObjects, getProjectBucket, projectObjectKey } from "@/lib/storage";
import { submissionFileKey } from "@/lib/submission-storage";
import { logAudit, serializeSubmission } from "@/lib/submissions";
import type { ManifestFile } from "@/lib/storage-validation";

async function copySubmissionFiles(submissionId: string, projectId: string, versionId: string, manifest: ManifestFile[]) {
  const bucket = getProjectBucket();
  for (let offset = 0; offset < manifest.length; offset += 20) {
    const batch = manifest.slice(offset, offset + 20);
    await Promise.all(batch.map(async (file) => {
      const source = await bucket.get(submissionFileKey(submissionId, file.path));
      if (!source || source.size !== file.size) throw new Error(`Submission file is missing or invalid: ${file.path}`);
      await bucket.put(projectObjectKey(projectId, versionId, file.path), source.body, { httpMetadata: source.httpMetadata });
    }));
  }
}

export async function acceptSubmission(submissionId: string, checklist: string[]) {
  const db = getDb();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
  if (!row) return { error: "Submission not found." } as const;
  if (row.projectId) return { projectId: row.projectId } as const;
  if (!row.coverKey) return { error: "The submission does not have a cover." } as const;
  if (!(row.status === "submitted" || row.status === "reviewing" || row.status === "changes_requested")) return { error: "This submission cannot be accepted in its current state." } as const;

  const external = row.sourceType === "url" ? await inspectExternalProjectUrl(row.externalUrl ?? "").catch(() => null) : null;
  if (row.sourceType === "url" && !external) return { error: "The external project address could not be verified." } as const;
  const projectId = crypto.randomUUID();
  const versionId = row.sourceType === "url" ? null : crypto.randomUUID();
  const bucket = getProjectBucket();
  const cover = await bucket.get(row.coverKey);
  if (!cover) return { error: "The submission cover could not be found." } as const;
  const coverType = cover.httpMetadata?.contentType ?? "image/png";
  const coverExtension = coverType === "image/jpeg" ? "jpg" : coverType === "image/webp" ? "webp" : coverType === "image/avif" ? "avif" : "png";
  const projectCoverKey = coverObjectKey(projectId, coverExtension);

  try {
    await bucket.put(projectCoverKey, cover.body, { httpMetadata: { contentType: coverType, cacheControl: "public, max-age=31536000, immutable" } });
    const manifest = JSON.parse(row.manifestJson) as ManifestFile[];
    if (versionId) await copySubmissionFiles(row.id, projectId, versionId, manifest);
    const now = new Date().toISOString();
    const [project] = await db.insert(projects).values({
      id: projectId,
      slug: await uniqueSlug(row.title),
      sourceType: row.sourceType,
      title: row.title,
      description: row.description,
      studentName: row.creatorDisplayName,
      creatorType: row.creatorType,
      creatorRole: row.creatorRole,
      gradeId: row.gradeId,
      classId: "",
      category: JSON.parse(row.categoriesJson)[0],
      categoriesJson: row.categoriesJson,
      technologiesJson: row.technologiesJson,
      externalUrl: external?.url ?? null,
      embedMode: external?.embedMode ?? "embedded",
      coverKey: projectCoverKey,
      coverAlt: row.coverAlt,
      draftVersionId: versionId,
      sourceSubmissionId: row.id,
      updatedAt: now,
    }).returning();
    if (versionId) {
      await db.insert(projectVersions).values({
        id: versionId,
        projectId,
        state: "ready",
        entryPath: "index.html",
        originalFilename: row.originalFilename,
        totalBytes: row.totalBytes,
        fileCount: row.fileCount,
        manifestJson: row.manifestJson,
      });
    }
    await db.update(submissions).set({ status: "accepted", projectId, reviewChecklistJson: JSON.stringify(checklist), reviewedAt: now, updatedAt: now, purgeAfter: null }).where(eq(submissions.id, row.id));
    await logAudit("submission.accepted", "submission", row.id, { projectId, referenceCode: row.referenceCode });
    return { project: { ...project, creatorDisplayName: project.studentName } } as const;
  } catch (error) {
    await deleteProjectObjects(projectId).catch(() => undefined);
    await db.delete(projects).where(eq(projects.id, projectId)).catch(() => undefined);
    return { error: error instanceof Error ? error.message : "The submission could not be converted into a project draft." } as const;
  }
}

export async function getSubmissionById(id: string) {
  const [row] = await getDb().select().from(submissions).where(eq(submissions.id, id)).limit(1);
  return row ? serializeSubmission(row) : null;
}
