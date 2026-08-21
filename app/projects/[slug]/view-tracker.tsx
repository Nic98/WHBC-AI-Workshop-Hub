"use client";

import { useEffect } from "react";

export function ViewTracker({ projectId }: { projectId: string }) {
  useEffect(() => {
    const day = new Date().toISOString().slice(0, 10);
    const key = `aiwh-viewed:${projectId}`;
    try {
      if (localStorage.getItem(key) === day) return;
      localStorage.setItem(key, day);
    } catch { /* Counting remains best-effort when browser storage is unavailable. */ }
    void fetch(`/api/projects/${projectId}/view`, { method: "POST", keepalive: true }).catch(() => undefined);
  }, [projectId]);
  return null;
}
