import assert from "node:assert/strict";
import test from "node:test";
import { frameBlockedByHeaders, isPrivateHostname, validateExternalProjectUrl } from "../lib/external.ts";
import { normalizeProjectPath, validateManifest } from "../lib/storage-validation.ts";
import { verifyPbkdf2Password } from "../lib/password.ts";
import { prepareProjectBytes } from "../lib/project-upload.ts";
import { readFile } from "node:fs/promises";
import { zipSync } from "fflate";
import { createProjectPreviewToken, verifyProjectPreviewToken } from "../lib/preview-token.ts";
import { isEmbeddedProjectPath } from "../lib/embedded-route.ts";
import { isLocalPreviewHostname, localPreviewOrigin } from "../lib/local-preview-origin.ts";
import { siteContentSecurityPolicy } from "../lib/security-headers.ts";

test("external project URLs accept only public HTTPS destinations", () => {
  assert.equal(validateExternalProjectUrl("https://example.com/demo#section"), "https://example.com/demo");
  for (const target of [
    "http://example.com", "https://localhost/app", "https://127.0.0.1", "https://10.1.2.3",
    "https://172.16.1.2", "https://192.168.1.10", "https://[::1]/", "https://admin:secret@example.com",
    "https://example.com:8443", "https://school.internal/project", "https://2130706433/", "https://0177.0.0.1/",
  ]) assert.equal(validateExternalProjectUrl(target), null, target);
  assert.equal(isPrivateHostname("169.254.169.254"), true);
});

test("embedding checks fail closed for restrictive response headers", () => {
  assert.equal(frameBlockedByHeaders(new Headers({ "x-frame-options": "DENY" })), true);
  assert.equal(frameBlockedByHeaders(new Headers({ "x-frame-options": "SAMEORIGIN" })), true);
  assert.equal(frameBlockedByHeaders(new Headers({ "content-security-policy": "default-src 'self'; frame-ancestors 'none'" })), true);
  assert.equal(frameBlockedByHeaders(new Headers({ "content-security-policy": "frame-ancestors https://hub.example" })), false);
});

test("uploaded project manifests reject traversal, executables, duplicates, and missing entrypoints", () => {
  assert.equal(normalizeProjectPath("../index.html"), null);
  assert.equal(normalizeProjectPath("assets/run.exe"), null);
  assert.equal(normalizeProjectPath("/index.html"), null);
  assert.match(validateManifest([{ path: "main.html", size: 12 }]).error ?? "", /index\.html/);
  assert.match(validateManifest([{ path: "index.html", size: 1 }, { path: "index.html", size: 1 }]).error ?? "", /duplicate/);
  assert.match(validateManifest([{ path: "index.html", size: 51 * 1024 * 1024 }]).error ?? "", /too large/);
  const valid = validateManifest([{ path: "index.html", size: 12, type: "text/html" }, { path: "assets/app.js", size: 8 }]);
  assert.equal("files" in valid && valid.files?.length, 2);
});

test("administrator password verification enforces the approved PBKDF2 format", async () => {
  const hash = "pbkdf2-sha256$210000$YWktd29ya3Nob3AtdGVzdC1zYWx0$JUqNjn/damuYWzBb3iTV7zDzaxSiKS/xJ7nPbbKhlG8=";
  assert.equal(await verifyPbkdf2Password("unit-test-passphrase", hash), true);
  assert.equal(await verifyPbkdf2Password("incorrect", hash), false);
  assert.equal(await verifyPbkdf2Password("anything", "pbkdf2-sha256$1000$bad$bad"), false);
});

test("browser-side upload preparation flattens a ZIP root and rejects oversized expansion metadata", async () => {
  const source = new Uint8Array(await readFile(new URL("./fixtures/zip-project.zip", import.meta.url)));
  const prepared = prepareProjectBytes("student-project.zip", source);
  assert.deepEqual(prepared.map((file) => file.path).sort(), ["assets/app.js", "assets/style.css", "index.html"]);

  const forged = source.slice();
  const view = new DataView(forged.buffer, forged.byteOffset, forged.byteLength);
  let central = -1;
  for (let offset = 0; offset + 46 <= forged.byteLength; offset += 1) {
    if (view.getUint32(offset, true) === 0x02014b50) { central = offset; break; }
  }
  assert.ok(central >= 0);
  view.setUint32(central + 24, 101 * 1024 * 1024, true);
  assert.throws(() => prepareProjectBytes("student-project.zip", forged), /larger than 50 MB|larger than 100 MB/);
});

test("ZIP uploads ignore macOS metadata without weakening path and file restrictions", () => {
  const encoder = new TextEncoder();
  const macArchive = zipSync({
    "Workshop Project/index.html": encoder.encode("<!doctype html><title>Workshop</title>"),
    "Workshop Project/assets/app.js": encoder.encode("document.body.dataset.ready = 'true';"),
    "__MACOSX/Workshop Project/._index.html": encoder.encode("apple-double metadata"),
    "Workshop Project/.DS_Store": encoder.encode("finder metadata"),
    "Workshop Project/assets/._app.js": encoder.encode("resource fork metadata"),
  });
  const prepared = prepareProjectBytes("finder-export.zip", macArchive);
  assert.deepEqual(prepared.map((file) => file.path).sort(), ["assets/app.js", "index.html"]);

  const traversalArchive = zipSync({ "../index.html": encoder.encode("unsafe") });
  assert.throws(() => prepareProjectBytes("traversal.zip", traversalArchive), /unsafe or unsupported/);

  const blockedFileArchive = zipSync({
    "index.html": encoder.encode("<!doctype html>"),
    "server.py": encoder.encode("print('not a browser project')"),
  });
  assert.throws(() => prepareProjectBytes("blocked-file.zip", blockedFileArchive), /unsafe or unsupported/);
});

test("draft preview tokens are version-scoped, tamper-resistant, and short-lived", async () => {
  const now = 1_800_000_000_000;
  const token = await createProjectPreviewToken("test-preview-secret", "project-a", "version-a", now);
  assert.equal(await verifyProjectPreviewToken("test-preview-secret", token, "project-a", "version-a", now + 1_000), true);
  assert.equal(await verifyProjectPreviewToken("test-preview-secret", token, "project-a", "version-b", now + 1_000), false);
  assert.equal(await verifyProjectPreviewToken("wrong-secret", token, "project-a", "version-a", now + 1_000), false);
  assert.equal(await verifyProjectPreviewToken("test-preview-secret", `${token.slice(0, -1)}x`, "project-a", "version-a", now + 1_000), false);
  assert.equal(await verifyProjectPreviewToken("test-preview-secret", token, "project-a", "version-a", now + 60 * 60 * 1000 + 1), false);
});

test("global frame blocking excludes only public and authorized project embed routes", () => {
  assert.equal(isEmbeddedProjectPath("/embed/project/version/index.html"), true);
  assert.equal(isEmbeddedProjectPath("/embed-preview/project/version/token/assets/app.js"), true);
  assert.equal(isEmbeddedProjectPath("/admin/preview/project"), false);
  assert.equal(isEmbeddedProjectPath("/embed-preview-malicious/project"), false);
  assert.equal(isEmbeddedProjectPath("/projects/example/run"), false);
});

test("local draft previews use an isolated loopback origin", () => {
  assert.equal(localPreviewOrigin("localhost:3001", "http"), "http://[::1]:3001");
  assert.equal(localPreviewOrigin("127.0.0.1:3001", "http"), "http://localhost:3001");
  assert.equal(localPreviewOrigin("[::1]:3001", "http"), "http://localhost:3001");
  assert.equal(localPreviewOrigin("hub.example", "https"), null);
  assert.equal(isLocalPreviewHostname("127.0.0.1"), true);
  assert.equal(isLocalPreviewHostname("hub.example"), false);
});

test("the admin CSP allows only the isolated local preview origin during local development", () => {
  const localPolicy = siteContentSecurityPolicy("http://localhost:3001/admin/preview/project");
  assert.match(localPolicy, /frame-src 'self' https: http:/);
  assert.match(localPolicy, /frame-ancestors 'none'/);

  const productionPolicy = siteContentSecurityPolicy("https://hub.example/admin/preview/project");
  assert.match(productionPolicy, /frame-src 'self' https:/);
  assert.doesNotMatch(productionPolicy, /http:\/\//);
});
