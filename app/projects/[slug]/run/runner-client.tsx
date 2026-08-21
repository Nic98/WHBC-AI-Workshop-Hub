"use client";

import { useEffect, useRef, useState } from "react";

type RunnerProject = {
  slug: string; title: string; studentName: string; description: string; category: string; categories: string[];
  creatorType: "student" | "teacher"; creatorRole: string | null;
  sourceType: string; externalUrl: string | null; id: string; currentVersionId: string | null;
  gradeLabel: string; technologies: string[];
};

export function ProjectRunner({ project }: { project: RunnerProject }) {
  const shell = useRef<HTMLDivElement>(null);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const projectFrame = useRef<HTMLIFrameElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fullscreenHint, setFullscreenHint] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const source = project.sourceType === "url" ? project.externalUrl ?? "" : `/embed/${project.id}/${project.currentVersionId}/index.html`;

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await shell.current?.requestFullscreen();
      setFullscreenHint(true);
      window.setTimeout(() => setFullscreenHint(false), 2400);
    }
  }

  useEffect(() => {
    function fullscreenChanged() {
      const entered = Boolean(document.fullscreenElement);
      setAnnouncement(entered ? "Fullscreen mode entered. Press Escape to exit fullscreen." : "Fullscreen mode exited.");
      if (!entered) fullscreenButton.current?.focus();
    }
    function escapeInfo(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.fullscreenElement && infoOpen) setInfoOpen(false);
    }
    document.addEventListener("fullscreenchange", fullscreenChanged);
    document.addEventListener("keydown", escapeInfo);
    return () => { document.removeEventListener("fullscreenchange", fullscreenChanged); document.removeEventListener("keydown", escapeInfo); };
  }, [infoOpen]);

  useEffect(() => {
    const frame = projectFrame.current;
    if (!frame) return;
    const ready = () => setLoaded(true);
    frame.addEventListener("load", ready);
    try { if (frame.contentDocument?.readyState === "complete") ready(); } catch { /* Cross-origin projects become ready through their load event. */ }
    const fallback = window.setTimeout(ready, 8_000);
    return () => { frame.removeEventListener("load", ready); window.clearTimeout(fallback); };
  }, []);

  return (
    <div className="runner-shell" ref={shell}>
      <header className="runner-bar">
        <a href={`/projects/${project.slug}`}>← Back to AI Workshop Hub</a>
        <div><strong>{project.title}</strong><span> · {project.studentName}</span></div>
        <div className="runner-actions">{project.sourceType === "url" ? <a href={project.externalUrl!} target="_blank" rel="noopener noreferrer">Open in new tab ↗</a> : null}<button onClick={() => setInfoOpen((value) => !value)}>Project Info</button><button onClick={() => void toggleFullscreen()} ref={fullscreenButton}>Fullscreen ⛶</button></div>
      </header>
      <main className="runner-viewport">
        {!loaded ? <div className={`runner-loading runner-${project.category.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`}><span>LOADING PROJECT</span><div><i /></div></div> : null}
        {failed ? <div className="runner-error"><h1>This project could not be displayed here.</h1><p>Try opening it in a new tab, or return to the project card.</p>{project.externalUrl ? <a className="primary-button" href={project.externalUrl} target="_blank" rel="noopener noreferrer">Open in new tab ↗</a> : null}</div> : null}
        <iframe
          allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'"
          onLoad={() => setLoaded(true)}
          onError={() => { setLoaded(true); setFailed(true); }}
          ref={projectFrame}
          sandbox={project.sourceType === "url" ? "allow-scripts allow-forms allow-downloads allow-modals allow-same-origin" : "allow-scripts allow-forms allow-downloads allow-modals"}
          src={source}
          title={`${project.title} by ${project.studentName}`}
        />
      </main>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      {fullscreenHint ? <div className="fullscreen-hint" role="status">Press Esc to exit fullscreen</div> : null}
      {infoOpen ? <aside className="runner-info"><button aria-label="Close project information" onClick={() => setInfoOpen(false)}><span aria-hidden="true" className="close-icon" /></button><span className="project-tag">{project.categories.join(" · ").toUpperCase()}</span><h2>{project.title}</h2><p>{project.description}</p><dl><div><dt>CREATOR</dt><dd>{project.studentName}</dd></div>{project.creatorType === "teacher" ? <div><dt>SUBJECT</dt><dd>{project.creatorRole}</dd></div> : <div><dt>GRADE</dt><dd>{project.gradeLabel}</dd></div>}<div><dt>BUILT WITH</dt><dd>{project.technologies.join(" · ")}</dd></div></dl></aside> : null}
    </div>
  );
}
