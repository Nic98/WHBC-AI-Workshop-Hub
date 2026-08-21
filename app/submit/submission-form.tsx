"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { prepareProjectFile, PreparedProjectFile } from "@/lib/project-upload";

type Options = {
  grades: Array<{ id: string; label: string }>;
  categories: readonly string[];
  technologies: readonly string[];
};

function MultiChoice({ legend, name, options }: { legend: string; name: string; options: readonly string[] }) {
  return <fieldset className="choice-field span-two"><legend>{legend}</legend><div className="choice-grid">{options.map((option) => <label key={option}><input name={name} type="checkbox" value={option} /><span>{option}</span></label>)}</div></fieldset>;
}

async function responseJson(response: Response) {
  return (await response.json().catch(() => ({}))) as { error?: string; submissionId?: string; uploadToken?: string; referenceCode?: string };
}

async function uploadFiles(submissionId: string, token: string, files: PreparedProjectFile[], onProgress: (message: string) => void) {
  for (let offset = 0; offset < files.length; offset += 4) {
    const batch = files.slice(offset, offset + 4);
    onProgress(`Uploading project files ${offset + 1}–${Math.min(offset + batch.length, files.length)} of ${files.length}…`);
    await Promise.all(batch.map(async (file) => {
      const body = file.bytes.buffer.slice(file.bytes.byteOffset, file.bytes.byteOffset + file.bytes.byteLength) as ArrayBuffer;
      const response = await fetch(`/api/submissions/${submissionId}/files?path=${encodeURIComponent(file.path)}`, { method: "PUT", headers: { authorization: `Bearer ${token}` }, body });
      const result = await responseJson(response);
      if (!response.ok) throw new Error(result.error ?? `The file ${file.path} could not be uploaded.`);
    }));
  }
}

export function SubmissionForm({ options }: { options: Options }) {
  const [creatorType, setCreatorType] = useState<"student" | "teacher">("student");
  const [sourceType, setSourceType] = useState<"html" | "zip" | "url">("html");
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true); setError(""); setProgress("Checking your project details…");
    try {
      const form = new FormData(formElement);
      const projectFile = form.get("projectFile");
      const coverFile = form.get("coverFile");
      if (!(coverFile instanceof File) || !coverFile.size) throw new Error("Choose a project cover image.");
      let files: PreparedProjectFile[] = [];
      if (sourceType !== "url") {
        if (!(projectFile instanceof File) || !projectFile.size) throw new Error(`Choose a ${sourceType.toUpperCase()} project file.`);
        setProgress("Checking the project archive for safe paths and private keys…");
        files = await prepareProjectFile(projectFile);
      }
      const createResponse = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          inviteCode: form.get("inviteCode"), honeypot: form.get("website"),
          creatorType, creatorDisplayName: form.get("creatorDisplayName"), contactEmail: form.get("contactEmail"),
          gradeId: creatorType === "student" ? form.get("gradeId") : "", creatorRole: creatorType === "teacher" ? form.get("creatorRole") : "",
          title: form.get("title"), description: form.get("description"), categories: form.getAll("categories"), technologies: form.getAll("technologies"),
          sourceType, externalUrl: sourceType === "url" ? form.get("externalUrl") : "", coverAlt: form.get("coverAlt"),
          testInstructions: form.get("testInstructions"), revisionReference: form.get("revisionReference"),
          originalFilename: sourceType === "url" ? null : (projectFile as File).name,
          manifest: files.map((file) => ({ path: file.path, size: file.bytes.byteLength, type: file.type })),
          rightsConfirmed: form.get("rightsConfirmed") === "on",
        }),
      });
      const created = await responseJson(createResponse);
      if (!createResponse.ok || !created.submissionId || !created.uploadToken) throw new Error(created.error ?? "The submission could not be started.");
      if (files.length) await uploadFiles(created.submissionId, created.uploadToken, files, setProgress);
      setProgress("Uploading the project cover…");
      const coverResponse = await fetch(`/api/submissions/${created.submissionId}/cover`, { method: "PUT", headers: { authorization: `Bearer ${created.uploadToken}`, "content-type": coverFile.type }, body: coverFile });
      const coverResult = await responseJson(coverResponse);
      if (!coverResponse.ok) throw new Error(coverResult.error ?? "The project cover could not be uploaded.");
      setProgress("Final check and teacher notification…");
      const finalizeResponse = await fetch(`/api/submissions/${created.submissionId}/finalize`, { method: "POST", headers: { authorization: `Bearer ${created.uploadToken}` } });
      const finalized = await responseJson(finalizeResponse);
      if (!finalizeResponse.ok || !finalized.referenceCode) throw new Error(finalized.error ?? "The submission could not be finalized.");
      window.location.assign(`/submit/success?reference=${encodeURIComponent(finalized.referenceCode)}`);
    } catch (reason) {
      setPending(false); setProgress(""); setError(reason instanceof Error ? reason.message : "The submission could not be completed.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <form className="submission-form" onSubmit={submit}>
      {error ? <div className="form-error" role="alert"><strong>Check this submission</strong><span>{error}</span></div> : null}
      {progress ? <div className="submission-progress" role="status"><span>{progress}</span><div><i /></div></div> : null}

      <section className="submission-section"><div className="submission-section-title"><span>01</span><div><h2>About you</h2><p>Only your approved display name and grade or subject can appear publicly.</p></div></div><div className="form-grid">
        <label>Creator type / 创作者身份<select value={creatorType} onChange={(event) => setCreatorType(event.target.value as "student" | "teacher")}><option value="student">Student / 学生</option><option value="teacher">Teacher / 教师</option></select></label>
        <label>English display name<input name="creatorDisplayName" maxLength={60} autoComplete="name" required /></label>
        <label>Contact email <span>(private)</span><input name="contactEmail" type="email" maxLength={160} autoComplete="email" required /></label>
        {creatorType === "student" ? <label>Grade<select name="gradeId" defaultValue={options.grades[0]?.id}>{options.grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}</select></label> : <label>Subject or department<input name="creatorRole" maxLength={60} placeholder="English · Humanities" required /></label>}
      </div></section>

      <section className="submission-section"><div className="submission-section-title"><span>02</span><div><h2>Project story</h2><p>Keep it clear and friendly—tell visitors what they can explore.</p></div></div><div className="form-grid">
        <label>Project title<input name="title" maxLength={42} required /></label>
        <label>Previous submission number <span>(optional)</span><input name="revisionReference" placeholder="AWH-YYYYMMDD-XXXXXX" pattern="AWH-[0-9]{8}-[A-Z2-9]{6}" /></label>
        <label className="span-two">Short description<textarea name="description" maxLength={180} required /></label>
        <MultiChoice legend="Category / 项目类别（可多选）" name="categories" options={options.categories} />
        <MultiChoice legend="Technologies / 使用技术（可多选）" name="technologies" options={options.technologies} />
        <label className="span-two">Testing notes for the reviewer <span>(optional)</span><textarea name="testInstructions" maxLength={500} placeholder="What should the teacher click or try? Mention any known limitations—never include passwords or API keys." /></label>
      </div></section>

      <section className="submission-section"><div className="submission-section-title"><span>03</span><div><h2>Files and cover</h2><p>Uploads stay quarantined until a teacher reviews them.</p></div></div><div className="form-grid">
        <label>Project format<select value={sourceType} onChange={(event) => setSourceType(event.target.value as "html" | "zip" | "url")}><option value="html">Single HTML file</option><option value="zip">ZIP project</option><option value="url">Public HTTPS URL</option></select></label>
        {sourceType === "url" ? <label>Project URL<input name="externalUrl" type="url" placeholder="https://" required /></label> : <label>Project file<input name="projectFile" type="file" accept={sourceType === "html" ? ".html,text/html" : ".zip,application/zip"} required /></label>}
        <label>Cover image<input name="coverFile" type="file" accept="image/png,image/jpeg,image/webp,image/avif" required /></label>
        <label>Cover description<input name="coverAlt" maxLength={180} placeholder="Describe what visitors see in the cover" required /></label>
      </div></section>

      <section className="submission-section submission-final"><div className="submission-section-title"><span>04</span><div><h2>Invitation and declaration</h2><p>The invitation code keeps this pilot community focused on our school.</p></div></div><div className="form-grid">
        <label>Invitation code<input name="inviteCode" type="password" minLength={8} maxLength={64} autoComplete="off" required /></label>
        <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label className="declaration span-two"><input name="rightsConfirmed" type="checkbox" required /><span>I created this project or have permission to share it. I have removed passwords, private information and secret API keys, and I understand that a teacher will decide whether it is published.</span></label>
      </div><div className="submission-actions"><p>By submitting, you also agree to the <Link href="/guidelines">project guidelines</Link> and <Link href="/privacy">privacy notice</Link>.</p><button className="primary-button" disabled={pending} type="submit">{pending ? "Submitting…" : "Submit for review"}<span aria-hidden="true">↗</span></button></div></section>
    </form>
  );
}
