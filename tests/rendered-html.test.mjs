import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("the home page source preserves its public community hierarchy", async () => {
  const source = await readFile(new URL("../app/home-content.tsx", import.meta.url), "utf8");
  assert.match(source, /Ideas become interactive\./);
  assert.match(source, /STUDENT-BUILT · TEACHER-SHARED/);
  assert.match(source, /STUDENT PROJECTS/);
  assert.match(source, /TEACHER TOOLS/);
  assert.match(source, /href="\/submit"/);
  assert.doesNotMatch(source, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("renders the public About page and preserves the fixed design system", async () => {
  const response = await render("/about");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Wuhan Britain-China School/);
  assert.match(html, /Projects made across our school/);
  assert.match(html, /STUDENT IDEAS\./);
  assert.match(html, /学生作品与教师 AI 工具分享社区/);
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--canvas:\s*#fbfaf7/);
  assert.match(css, /--violet:\s*#c8b6ff/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css, /cursor-trail|scroll-jacking|rainbow-border/i);
});
