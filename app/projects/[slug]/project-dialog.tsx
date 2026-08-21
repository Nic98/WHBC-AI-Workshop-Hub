"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ShareControls } from "./share-controls";

type DialogProject = {
  id: string; slug: string; title: string; description: string; studentName: string;
  creatorType: "student" | "teacher"; creatorRole: string | null;
  gradeLabel: string; technologies: string[]; categories: string[];
  category: string; coverKey: string | null; coverAlt: string; sourceType: string;
  embedMode: string; externalUrl: string | null;
};

export function ProjectDialog({ project }: { project: DialogProject }) {
  const dialog = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  function close() {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer?.origin === window.location.origin && (referrer.pathname === "/projects" || referrer.pathname === "/")) {
        window.history.back();
        return;
      }
    } catch { /* Fall through to the reliable gallery destination. */ }
    window.location.assign("/projects");
  }

  useEffect(() => {
    closeButton.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const launchHref = project.sourceType === "url" && project.embedMode === "external" ? project.externalUrl! : `/projects/${project.slug}/run`;
  return (
    <article aria-labelledby="project-title" aria-modal="true" className="expanded-card" ref={dialog} role="dialog">
      <button aria-label="Close project details" className="dialog-close" onClick={close} ref={closeButton}><span aria-hidden="true" className="close-icon" /></button>
      <div className="expanded-cover">{project.coverKey ? <Image fill sizes="(max-width: 900px) 100vw, 58vw" src={`/media/covers/${project.id}`} alt={project.coverAlt} style={{ objectFit: "contain" }} /> : <div className="cover-placeholder"><span>{project.categories[0]}</span><b>{project.title.slice(0, 1)}</b></div>}</div>
      <div className="expanded-info">
        <div className="gallery-tags">{project.categories.map((category) => <span key={category}>{category.toUpperCase()}</span>)}</div>
        <h1 id="project-title">{project.title}</h1><p className="expanded-description">{project.description}</p>
        <dl><div><dt>CREATOR</dt><dd>{project.studentName}</dd></div>{project.creatorType === "teacher" ? <div><dt>SUBJECT</dt><dd>{project.creatorRole}</dd></div> : <div><dt>GRADE</dt><dd>{project.gradeLabel}</dd></div>}<div><dt>BUILT WITH</dt><dd>{project.technologies.join(" · ")}</dd></div></dl>
        <ShareControls title={project.title} />
        <a className="primary-button expanded-action" href={launchHref} target={project.embedMode === "external" ? "_blank" : undefined} rel={project.embedMode === "external" ? "noopener noreferrer" : undefined}>体验项目 <span aria-hidden="true">↗</span></a>
      </div>
    </article>
  );
}
