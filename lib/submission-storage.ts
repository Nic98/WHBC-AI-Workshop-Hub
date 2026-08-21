import { getProjectBucket } from "./storage.ts";

export function submissionFileKey(submissionId: string, path: string) {
  return `submissions/${submissionId}/files/${path}`;
}

export function submissionCoverKey(submissionId: string, extension: string) {
  return `submissions/${submissionId}/cover.${extension}`;
}

export async function deleteSubmissionObjects(submissionId: string) {
  const bucket = getProjectBucket();
  const prefix = `submissions/${submissionId}/`;
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    if (page.objects.length) await bucket.delete(page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
