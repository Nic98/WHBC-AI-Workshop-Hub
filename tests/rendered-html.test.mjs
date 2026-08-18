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

test("server-renders the Idea Playground home page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>AI Workshop Hub<\/title>/i);
  assert.match(html, /Ideas become interactive\./);
  assert.match(html, /Explore AI projects designed and built by students\./);
  assert.match(html, /Featured Projects/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("renders the public About page and preserves the fixed design system", async () => {
  const response = await render("/about");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Wuhan Britain-China School/);
  assert.match(html, /Student AI Project Community/);
  assert.match(html, /NOT JUST A GALLERY\./);
  assert.match(html, /项目交流社区|关于社区/);
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--canvas:\s*#fbfaf7/);
  assert.match(css, /--violet:\s*#c8b6ff/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css, /cursor-trail|scroll-jacking|rainbow-border/i);
});
