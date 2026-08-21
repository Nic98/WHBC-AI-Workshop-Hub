import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isAdminPageSession, issueSubmissionPreviewToken } from "@/lib/auth";
import { validateExternalProjectUrl } from "@/lib/external";
import { localPreviewOrigin } from "@/lib/local-preview-origin";
import { getSubmissionById } from "@/lib/submission-review";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Submission preview", robots: { index: false, follow: false } };

export default async function SubmissionPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminPageSession().catch(() => false))) redirect("/admin/login");
  const { id } = await params;
  const submission = await getSubmissionById(id);
  if (!submission || submission.status === "uploading") notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const isolatedPreviewOrigin = localPreviewOrigin(host, protocol);
  const token = submission.sourceType === "url" ? null : await issueSubmissionPreviewToken(submission.id);
  const previewPath = `/embed-submission/${submission.id}/${token}/index.html`;
  const source = submission.sourceType === "url" ? validateExternalProjectUrl(submission.externalUrl ?? "") : `${isolatedPreviewOrigin ?? ""}${previewPath}`;
  if (!source) notFound();
  return (
    <main className="preview-shell">
      <header className="runner-bar">
        <a href="/admin">← Back to submissions</a>
        <div><strong>Review · {submission.title}</strong><span> · {submission.creatorDisplayName}</span></div>
        <span className="preview-badge">QUARANTINED</span>
      </header>
      <section className="runner-viewport">
        {submission.sourceType === "url" ? (
          <div className="preview-external"><span className="eyebrow">EXTERNAL PROJECT</span><h1>{submission.title}</h1><p>Open this unverified HTTPS project in a separate tab. It is not yet part of the public Hub.</p><a className="primary-button" href={source} target="_blank" rel="noopener noreferrer">Open project ↗</a></div>
        ) : (
          <iframe allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'" sandbox={isolatedPreviewOrigin ? "allow-scripts allow-forms allow-downloads allow-modals allow-same-origin" : "allow-scripts allow-forms allow-downloads allow-modals"} src={source} title={`Review ${submission.title}`} />
        )}
      </section>
    </main>
  );
}
