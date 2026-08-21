"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Submission = {
  id: string; referenceCode: string; status: string; creatorType: "student" | "teacher"; creatorDisplayName: string;
  contactEmail: string; gradeId: string; creatorRole: string | null; title: string; description: string;
  categories: string[]; technologies: string[]; sourceType: string; externalUrl: string | null; coverAlt: string;
  testInstructions: string; revisionReference: string | null; originalFilename: string | null; totalBytes: number; fileCount: number;
  coverKey: string | null; notificationState: string; notificationError: string | null; projectId: string | null;
  reviewChecklist: string[]; createdAt: string; purgeAfter: number | null;
};

type SubmissionResponse = { submissions: Submission[]; summary: { total: number; awaiting: number; accepted: number }; error?: string };

const checklistItems = [
  { id: "tested", label: "Project opens and the main experience works" },
  { id: "safe", label: "No passwords, API keys, private data or unsafe behavior" },
  { id: "identity", label: "English display name and grade or teacher role are correct" },
  { id: "rights", label: "Public sharing and asset permissions have been confirmed" },
  { id: "presentation", label: "Cover, description and basic mobile experience are ready" },
] as const;

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function SubmissionsPanel() {
  const [data, setData] = useState<SubmissionResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/submissions", { cache: "no-store" });
    if (response.status === 401) return window.location.assign("/admin/login");
    const result = (await response.json().catch(() => ({}))) as SubmissionResponse;
    if (!response.ok) return setError(result.error ?? "The submission queue could not be loaded.");
    setData(result);
    setChecks(Object.fromEntries(result.submissions.map((item) => [item.id, item.reviewChecklist])));
    const requested = new URLSearchParams(window.location.search).get("submission");
    if (requested && result.submissions.some((item) => item.id === requested)) setSelectedId(requested);
  }

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  const selected = useMemo(() => data?.submissions.find((item) => item.id === selectedId) ?? null, [data, selectedId]);

  function toggleCheck(submissionId: string, check: string, enabled: boolean) {
    setChecks((current) => ({ ...current, [submissionId]: enabled ? [...new Set([...(current[submissionId] ?? []), check])] : (current[submissionId] ?? []).filter((item) => item !== check) }));
  }

  async function action(submission: Submission, name: string) {
    if (name === "rejected" && !window.confirm(`Reject “${submission.title}”? Its quarantined files will be removed after 30 days.`)) return;
    setPending(true); setError(""); setNotice("");
    const response = await fetch(`/api/admin/submissions/${submission.id}/actions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: name, checklist: checks[submission.id] ?? [] }) });
    const result = (await response.json().catch(() => ({}))) as { error?: string; project?: { id: string } };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "The submission could not be updated.");
    setNotice(name === "accept" ? "Accepted as a project draft. Preview it in Projects before publishing." : name === "retry-notification" ? "Notification retried." : "Submission status updated.");
    await load();
  }

  return <section className="submission-admin" aria-labelledby="submission-queue-title">
    <div className="admin-title-row compact-admin-title"><div><span className="eyebrow">SUBMISSION QUEUE · 投稿审核</span><h2 id="submission-queue-title">Review new work</h2><p>Files remain quarantined until you test and accept them.</p></div><button className="secondary-button" onClick={() => void load()}>Refresh</button></div>
    <div className="admin-stats submission-stats"><div><span>ALL SUBMISSIONS</span><strong>{data?.summary.total ?? "—"}</strong></div><div><span>AWAITING REVIEW</span><strong>{data?.summary.awaiting ?? "—"}</strong></div><div><span>ACCEPTED</span><strong>{data?.summary.accepted ?? "—"}</strong></div></div>
    {notice ? <p className="admin-notice" role="status">{notice}</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}
    <div className="submission-admin-layout">
      <div className="submission-list" aria-label="Submissions">
        {!data ? <p className="table-empty">Loading submissions…</p> : data.submissions.length === 0 ? <div className="table-empty"><strong>No submissions yet.</strong><span>Share the invitation code when the pilot is ready.</span></div> : data.submissions.map((submission) => <button className={selectedId === submission.id ? "submission-list-item selected" : "submission-list-item"} key={submission.id} onClick={() => setSelectedId(submission.id)}><span className={`status status-${submission.status}`}>{submission.status.replaceAll("_", " ")}</span><strong>{submission.title}</strong><small>{submission.creatorDisplayName} · {submission.referenceCode}</small><time>{new Date(submission.createdAt).toLocaleDateString()}</time></button>)}
      </div>
      <div className="submission-review-card">
        {!selected ? <div className="submission-review-empty"><span aria-hidden="true">↖</span><h3>Select a submission to review.</h3><p>投稿资料、隔离预览和审核清单会显示在这里。</p></div> : <>
          <div className="submission-review-cover">{selected.coverKey ? <Image fill unoptimized sizes="(max-width: 900px) 100vw, 46vw" src={`/api/admin/submissions/${selected.id}/cover`} alt={selected.coverAlt} style={{ objectFit: "contain" }} /> : null}</div>
          <div className="submission-review-heading"><div><span className="project-tag">{selected.referenceCode}</span><h3>{selected.title}</h3><p>{selected.description}</p></div><span className={`status status-${selected.status}`}>{selected.status.replaceAll("_", " ")}</span></div>
          <dl className="submission-details"><div><dt>CREATOR</dt><dd>{selected.creatorDisplayName} · {selected.creatorType === "teacher" ? selected.creatorRole : selected.gradeId}</dd></div><div><dt>CONTACT</dt><dd><a href={`mailto:${selected.contactEmail}`}>{selected.contactEmail}</a></dd></div><div><dt>CATEGORY</dt><dd>{selected.categories.join(" · ")}</dd></div><div><dt>BUILT WITH</dt><dd>{selected.technologies.join(" · ")}</dd></div><div><dt>SOURCE</dt><dd>{selected.sourceType.toUpperCase()} · {selected.fileCount ? `${selected.fileCount} files · ${formatBytes(selected.totalBytes)}` : selected.externalUrl}</dd></div>{selected.revisionReference ? <div><dt>REVISION OF</dt><dd>{selected.revisionReference}</dd></div> : null}</dl>
          {selected.testInstructions ? <div className="review-notes"><span>TESTING NOTES</span><p>{selected.testInstructions}</p></div> : null}
          <div className="notification-state"><span>EMAIL ALERT</span><strong>{selected.notificationState}</strong>{selected.notificationError ? <small>{selected.notificationError}</small> : null}{selected.notificationState !== "sent" ? <button disabled={pending} onClick={() => void action(selected, "retry-notification")}>Retry</button> : null}</div>
          <fieldset className="review-checklist"><legend>Publishing review checklist</legend>{checklistItems.map((item) => <label key={item.id}><input checked={(checks[selected.id] ?? []).includes(item.id)} onChange={(event) => toggleCheck(selected.id, item.id, event.target.checked)} type="checkbox" /><span>{item.label}</span></label>)}</fieldset>
          <div className="submission-review-actions">
            {selected.status !== "accepted" ? <Link href={`/admin/submissions/${selected.id}/preview`} target="_blank" rel="noreferrer">Safe preview ↗</Link> : selected.projectId ? <Link href={`/admin/preview/${selected.projectId}`} target="_blank" rel="noreferrer">Open project draft ↗</Link> : null}
            {selected.status === "submitted" ? <button disabled={pending} onClick={() => void action(selected, "reviewing")}>Start review</button> : null}
            {!(["accepted", "rejected"].includes(selected.status)) ? <button disabled={pending} onClick={() => void action(selected, "changes_requested")}>Needs changes</button> : null}
            {!(["accepted", "rejected"].includes(selected.status)) ? <button className="danger-control" disabled={pending} onClick={() => void action(selected, "rejected")}>Reject</button> : null}
            {!(["accepted", "rejected"].includes(selected.status)) ? <button className="ink-control" disabled={pending || checklistItems.some((item) => !(checks[selected.id] ?? []).includes(item.id))} onClick={() => void action(selected, "accept")}>Accept as draft</button> : null}
          </div>
        </>}
      </div>
    </div>
  </section>;
}
