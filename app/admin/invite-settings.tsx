"use client";

import { FormEvent, useEffect, useState } from "react";

type InviteStatus = { configured: boolean; updatedAt: string | null; error?: string };

export function InviteSettings() {
  const [status, setStatus] = useState<InviteStatus | null>(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/invite", { cache: "no-store" });
    const result = (await response.json().catch(() => ({}))) as InviteStatus;
    if (response.ok) setStatus(result); else setError(result.error ?? "Invitation settings could not be loaded.");
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);

  function generate() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    setCode([...bytes].map((value) => alphabet[value % alphabet.length]).join(""));
    setNotice("A new code is ready. Save it, then copy it before leaving this page.");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setNotice("");
    const response = await fetch("/api/admin/invite", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    const result = (await response.json().catch(() => ({}))) as InviteStatus;
    setPending(false);
    if (!response.ok) return setError(result.error ?? "The invitation code could not be updated.");
    setStatus(result); setNotice("Invitation code updated. The previous code no longer works.");
  }

  return <section className="invite-settings"><div className="form-heading"><div><span className="project-tag">SUBMISSION ACCESS</span><h2>Invitation code</h2></div><p>Only a salted hash is stored. The current code cannot be recovered after you leave this page.</p></div><div className="invite-status"><span className={status?.configured ? "status status-published" : "status status-draft"}>{status?.configured ? "ACTIVE" : "NOT CONFIGURED"}</span>{status?.updatedAt ? <small>Last rotated {new Date(status.updatedAt).toLocaleString()}</small> : null}</div><form onSubmit={save}><label>New invitation code<input minLength={8} maxLength={64} value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" required /></label><div><button className="secondary-button" type="button" onClick={generate}>Generate code</button><button className="primary-button" disabled={pending} type="submit">{pending ? "Saving…" : "Rotate code"}</button></div></form>{notice ? <p className="admin-notice" role="status">{notice}</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}</section>;
}
