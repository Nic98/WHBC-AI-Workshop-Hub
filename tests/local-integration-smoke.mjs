import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const baseUrl = process.env.AIWH_BASE_URL ?? "http://localhost:3000";
const email = process.env.AIWH_ADMIN_EMAIL;
const password = process.env.AIWH_ADMIN_PASSWORD;
const keepFixtures = process.env.AIWH_KEEP_FIXTURES === "1";
if (!email || !password) throw new Error("Set AIWH_ADMIN_EMAIL and AIWH_ADMIN_PASSWORD before running this local integration test.");

let cookie = "";
const createdProjectIds = [];
let temporaryOption = null;

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("origin", baseUrl);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data };
}

async function json(path, method, body) {
  return request(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

async function uploadVersion(projectId, originalFilename, files) {
  const start = await json(`/api/admin/projects/${projectId}/versions`, "POST", {
    originalFilename,
    files: files.map((file) => ({ path: file.path, size: file.bytes.byteLength, type: file.type })),
  });
  assert.equal(start.response.status, 201, JSON.stringify(start.data));
  const versionId = start.data.versionId;
  for (const file of files) {
    const uploaded = await request(`/api/admin/projects/${projectId}/versions/${versionId}/files?path=${encodeURIComponent(file.path)}`, { method: "PUT", body: file.bytes });
    assert.equal(uploaded.response.status, 200, JSON.stringify(uploaded.data));
  }
  const finalized = await request(`/api/admin/projects/${projectId}/versions/${versionId}/finalize`, { method: "POST" });
  assert.equal(finalized.response.status, 200, JSON.stringify(finalized.data));
  assert.equal(finalized.data.previewUrl, `/admin/preview/${projectId}`);
  return versionId;
}

async function createProject(payload) {
  const created = await json("/api/admin/projects", "POST", payload);
  assert.equal(created.response.status, 201, JSON.stringify(created.data));
  createdProjectIds.push(created.data.project.id);
  return created.data.project;
}

async function uploadCover(projectId) {
  const cover = await readFile(new URL("./fixtures/cover.png", import.meta.url));
  const uploaded = await request(`/api/admin/projects/${projectId}/cover`, { method: "PUT", headers: { "content-type": "image/png" }, body: cover });
  assert.equal(uploaded.response.status, 200, JSON.stringify(uploaded.data));
}

try {
  const unauthenticated = await fetch(`${baseUrl}/api/admin/projects`);
  assert.equal(unauthenticated.status, 401);
  const rejectedLogin = await json("/api/admin/login", "POST", { email, password: `${password}-wrong` });
  assert.equal(rejectedLogin.response.status, 401);
  const login = await json("/api/admin/login", "POST", { email, password });
  assert.equal(login.response.status, 200, JSON.stringify(login.data));
  cookie = login.response.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert.match(cookie, /^whbc_admin_session=/);
  const crossOrigin = await fetch(`${baseUrl}/api/admin/options`, { method: "POST", headers: { origin: "https://attacker.example", cookie, "content-type": "application/json" }, body: JSON.stringify({ type: "grade", label: "Rejected" }) });
  assert.ok(crossOrigin.status === 401 || crossOrigin.status === 403);

  const option = await json("/api/admin/options", "POST", { type: "grade", label: `Grade Smoke ${Date.now()}` });
  assert.equal(option.response.status, 201, JSON.stringify(option.data));
  temporaryOption = option.data.option;
  const hidden = await json("/api/admin/options", "PATCH", { type: "grade", id: temporaryOption.id, active: false });
  assert.equal(hidden.response.status, 200, JSON.stringify(hidden.data));

  const single = await createProject({
    title: `Orbit Lab ${Date.now()}`, description: "A small interactive orbit experiment used to verify the complete publishing workflow.",
    studentName: "Test Student", gradeId: "grade-10", classId: "predp3", categories: ["Simulation", "Academic"],
    technologies: ["HTML", "CSS", "JavaScript"], coverAlt: "A purple orbit experiment", sourceType: "html", externalUrl: "",
  });
  const v1Bytes = await readFile(new URL("./fixtures/single-project.html", import.meta.url));
  const versionOne = await uploadVersion(single.id, "single-project.html", [{ path: "index.html", bytes: v1Bytes, type: "text/html" }]);
  await uploadCover(single.id);
  assert.equal((await json(`/api/admin/projects/${single.id}/actions`, "POST", { action: "publish" })).response.status, 200);
  assert.equal((await json(`/api/admin/projects/${single.id}/actions`, "POST", { action: "feature" })).response.status, 200);

  const embedded = await request(`/embed/${single.id}/${versionOne}/index.html`);
  assert.equal(embedded.response.status, 200);
  assert.match(String(embedded.data), /Orbit Lab/);
  assert.match(embedded.response.headers.get("content-security-policy") ?? "", /sandbox allow-scripts/);

  const v2Bytes = new TextEncoder().encode(String(v1Bytes).replace("Orbit Lab</h1>", "Orbit Lab v2</h1>"));
  const versionTwo = await uploadVersion(single.id, "single-project-v2.html", [{ path: "index.html", bytes: v2Bytes, type: "text/html" }]);
  assert.notEqual(versionTwo, versionOne);
  assert.equal((await json(`/api/admin/projects/${single.id}/actions`, "POST", { action: "publish" })).response.status, 200);
  assert.equal((await json(`/api/admin/projects/${single.id}/actions`, "POST", { action: "rollback" })).response.status, 200);

  const updated = await json(`/api/admin/projects/${single.id}`, "PATCH", {
    title: `${single.title} Edited`, description: "An edited description that confirms administrators can safely update project metadata.",
    studentName: "Test Student", gradeId: "grade-10", classId: "predp3", categories: ["Simulation", "Academic"],
    technologies: ["HTML", "CSS", "JavaScript"], coverAlt: "A purple orbit experiment", sourceType: "html", externalUrl: "",
  });
  assert.equal(updated.response.status, 200, JSON.stringify(updated.data));
  assert.equal(updated.data.project.slug, single.slug);
  const detailPage = await request(`/projects/${updated.data.project.slug}`);
  assert.equal(detailPage.response.status, 200);
  assert.match(String(detailPage.data), new RegExp(`<meta[^>]+property="og:title"[^>]+content="${updated.data.project.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i"));
  assert.match(String(detailPage.data), new RegExp(`/media/covers/${single.id}`));
  assert.doesNotMatch(String(detailPage.data), /property="og:image"[^>]+og\.png/i);
  const runnerPage = await request(`/projects/${updated.data.project.slug}/run`);
  assert.equal(runnerPage.response.status, 200);
  assert.match(String(runnerPage.data), /twitter:title/i);

  const zipProject = await createProject({
    title: `Signal Garden ${Date.now()}`, description: "A multi-file ZIP project used to verify relative CSS and JavaScript assets.",
    studentName: "Test Student", gradeId: "grade-9", classId: "preap2", categories: ["Art", "Tool"],
    technologies: ["HTML", "CSS", "JavaScript"], coverAlt: "A bright signal garden interface", sourceType: "zip", externalUrl: "",
  });
  const zipFiles = await Promise.all([
    ["index.html", "text/html"], ["assets/style.css", "text/css"], ["assets/app.js", "text/javascript"],
  ].map(async ([path, type]) => ({ path, type, bytes: await readFile(new URL(`./fixtures/zip-project/${path}`, import.meta.url)) })));
  const zipVersion = await uploadVersion(zipProject.id, "zip-project.zip", zipFiles);
  await uploadCover(zipProject.id);
  assert.equal((await json(`/api/admin/projects/${zipProject.id}/actions`, "POST", { action: "publish" })).response.status, 200);
  const zipAsset = await request(`/embed/${zipProject.id}/${zipVersion}/assets/app.js`);
  assert.equal(zipAsset.response.status, 200);
  assert.match(String(zipAsset.data), /Signal received/);

  const publicCatalog = await request("/api/projects?technology=JavaScript&grade=grade-10");
  assert.equal(publicCatalog.response.status, 200);
  assert.ok(publicCatalog.data.projects.some((project) => project.id === single.id));
  assert.ok(!publicCatalog.data.projects.some((project) => project.id === zipProject.id));
  const homePage = await request("/");
  assert.match(String(homePage.data), /og\.png/);

  console.log(JSON.stringify({ message: "Local integration smoke test passed.", projectIds: createdProjectIds, slugs: [updated.data.project.slug, zipProject.slug] }));
} finally {
  if (!keepFixtures) {
    for (const id of createdProjectIds.reverse()) await request(`/api/admin/projects/${id}`, { method: "DELETE" }).catch(() => undefined);
  }
  if (temporaryOption) await json("/api/admin/options", "DELETE", { type: "grade", id: temporaryOption.id }).catch(() => undefined);
}
