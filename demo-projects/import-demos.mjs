import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const baseUrl = process.env.AIWH_BASE_URL ?? "http://localhost:3000";
const email = process.env.AIWH_ADMIN_EMAIL;
const password = process.env.AIWH_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("Set AIWH_ADMIN_EMAIL and AIWH_ADMIN_PASSWORD before importing demos.");
}

let cookie = "";

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

function json(path, method, body) {
  return request(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function uploadHtml(projectId, sourcePath) {
  const bytes = await readFile(new URL(sourcePath, import.meta.url));
  const started = await json(`/api/admin/projects/${projectId}/versions`, "POST", {
    originalFilename: "index.html",
    files: [{ path: "index.html", size: bytes.byteLength, type: "text/html" }],
  });
  assert.equal(started.response.status, 201, JSON.stringify(started.data));
  const versionId = started.data.versionId;
  const uploaded = await request(`/api/admin/projects/${projectId}/versions/${versionId}/files?path=index.html`, {
    method: "PUT",
    headers: { "content-type": "text/html" },
    body: bytes,
  });
  assert.equal(uploaded.response.status, 200, JSON.stringify(uploaded.data));
  const finalized = await request(`/api/admin/projects/${projectId}/versions/${versionId}/finalize`, { method: "POST" });
  assert.equal(finalized.response.status, 200, JSON.stringify(finalized.data));
}

async function uploadCover(projectId, sourcePath) {
  const bytes = await readFile(new URL(sourcePath, import.meta.url));
  const uploaded = await request(`/api/admin/projects/${projectId}/cover`, {
    method: "PUT",
    headers: { "content-type": "image/jpeg" },
    body: bytes,
  });
  assert.equal(uploaded.response.status, 200, JSON.stringify(uploaded.data));
}

const demos = [
  {
    title: "Eco City Simulator",
    description: "Explore how clean energy, public transit, and green space can shape a city's air quality, carbon index, mobility, and wellbeing through an interactive scenario model.",
    categories: ["Simulation", "Academic"],
    technologies: ["HTML", "CSS", "JavaScript"],
    coverAlt: "Eco City Simulator interface with sustainability controls and a colorful city skyline",
    source: "./eco-city-simulator/index.html",
    cover: "./eco-city-simulator/cover.jpg",
    featured: true,
  },
  {
    title: "Story Seed Lab",
    description: "Combine a character, setting, and mood to generate a locally assembled story title, opening paragraph, and three-part narrative path.",
    categories: ["Art", "Tool"],
    technologies: ["HTML", "CSS", "JavaScript"],
    coverAlt: "Story Seed Lab interface with prompt controls and a generated story card",
    source: "./story-seed-lab/index.html",
    cover: "./story-seed-lab/cover.jpg",
    featured: false,
  },
  {
    title: "Sound Shape Studio",
    description: "Turn tempo, energy, and complexity into an animated generative composition, then play a short sound pattern built from the same creative rules.",
    categories: ["Art", "Tool"],
    technologies: ["HTML", "Canvas", "Web Audio", "JavaScript"],
    coverAlt: "Sound Shape Studio interface with orbiting colored forms and music controls",
    source: "./sound-shape-studio/index.html",
    cover: "./sound-shape-studio/cover.jpg",
    featured: false,
  },
];

const login = await json("/api/admin/login", "POST", { email, password });
assert.equal(login.response.status, 200, "Administrator sign-in failed.");
cookie = login.response.headers.get("set-cookie")?.split(";")[0] ?? "";
assert.ok(cookie, "Administrator session cookie was not returned.");

let catalog = await request("/api/admin/projects");
assert.equal(catalog.response.status, 200, JSON.stringify(catalog.data));
const grade = catalog.data.options.grades.find((option) => option.id === "grade-10");
assert.ok(grade, "Grade 10 option is missing.");
const classOption = catalog.data.options.classes.find((option) => option.id === "predp3");
assert.ok(classOption, "PreDP3 class option is missing.");
catalog = await request("/api/admin/projects");

const results = [];
for (const demo of demos) {
  let project = catalog.data.projects.find((candidate) => candidate.title === demo.title);
  let createdNow = false;
  if (!project) {
    const created = await json("/api/admin/projects", "POST", {
      title: demo.title,
      description: demo.description,
      studentName: "AI Workshop Hub Demo",
      gradeId: grade.id,
      classId: classOption.id,
      categories: demo.categories,
      technologies: demo.technologies,
      coverAlt: demo.coverAlt,
      sourceType: "html",
      externalUrl: "",
    });
    assert.equal(created.response.status, 201, JSON.stringify(created.data));
    project = created.data.project;
    createdNow = true;
  } else {
    const updated = await json(`/api/admin/projects/${project.id}`, "PATCH", {
      title: demo.title,
      description: demo.description,
      studentName: "AI Workshop Hub Demo",
      gradeId: grade.id,
      classId: classOption.id,
      categories: demo.categories,
      technologies: demo.technologies,
      coverAlt: demo.coverAlt,
      sourceType: "html",
      externalUrl: "",
    });
    assert.equal(updated.response.status, 200, JSON.stringify(updated.data));
    project = updated.data.project;
  }
  if (createdNow) {
    await uploadHtml(project.id, demo.source);
    await uploadCover(project.id, demo.cover);
    const published = await json(`/api/admin/projects/${project.id}/actions`, "POST", { action: "publish" });
    assert.equal(published.response.status, 200, JSON.stringify(published.data));
  }
  const featureAction = demo.featured ? "feature" : "unfeature";
  const featured = await json(`/api/admin/projects/${project.id}/actions`, "POST", { action: featureAction });
  assert.equal(featured.response.status, 200, JSON.stringify(featured.data));
  results.push({ title: demo.title, slug: project.slug, featured: demo.featured });
}

const legacyDemoGrade = catalog.data.options.grades.find((option) => option.id === "demo-collection");
if (legacyDemoGrade) {
  const removed = await json("/api/admin/options", "DELETE", { type: "grade", id: legacyDemoGrade.id });
  assert.equal(removed.response.status, 200, JSON.stringify(removed.data));
}

console.log(JSON.stringify({ message: "Demo projects imported.", projects: results }, null, 2));
