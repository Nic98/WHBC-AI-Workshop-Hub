import { and, asc, desc, eq, like, or } from "drizzle-orm";
import { getDb } from "@/db";
import { classOptions, gradeOptions, projects } from "@/db/schema";
import { validateExternalProjectUrl } from "@/lib/external";

export const categories = [
  "Game",
  "Tool",
  "Art",
  "Simulation",
  "Academic",
] as const;

export const technologyOptions = [
  "HTML", "CSS", "JavaScript", "Python", "Scratch", "p5.js", "Three.js",
  "React", "Canvas", "Web Audio", "AI API", "Teachable Machine", "TensorFlow.js",
] as const;

export const classProgrammes = ["PreAP", "PreDP", "PA"] as const;
export const classNumbers = Array.from({ length: 12 }, (_, index) => index + 1);

export type ProjectPayload = {
  title: string;
  description: string;
  studentName: string;
  creatorType: "student" | "teacher";
  creatorRole: string | null;
  gradeId: string;
  classId: string;
  categories: (typeof categories)[number][];
  technologies: string[];
  coverAlt: string;
  sourceType: "html" | "zip" | "url";
  externalUrl: string | null;
};

export function parseList(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function serializeProject(row: typeof projects.$inferSelect) {
  const storedCategories = parseList(row.categoriesJson);
  const creatorType: "student" | "teacher" = row.creatorType === "teacher" ? "teacher" : "student";
  return {
    ...row,
    creatorType,
    categories: storedCategories.length ? storedCategories : [row.category],
    technologies: parseList(row.technologiesJson),
  };
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(readString).filter(Boolean))];
}

export function validateProjectPayload(input: unknown): { data?: ProjectPayload; error?: string } {
  const value = input as Record<string, unknown> | null;
  if (!value) return { error: "Project details are missing." };
  const title = readString(value.title);
  const description = readString(value.description);
  const studentName = readString(value.studentName);
  const creatorType = readString(value.creatorType) || "student";
  const creatorRole = readString(value.creatorRole) || null;
  const gradeId = creatorType === "teacher" ? "" : readString(value.gradeId);
  const classId = creatorType === "teacher" ? "" : readString(value.classId);
  const selectedCategories = readList(value.categories);
  const technologies = readList(value.technologies);
  const coverAlt = readString(value.coverAlt);
  const sourceType = readString(value.sourceType);
  const externalUrl = readString(value.externalUrl) || null;

  if (!title || title.length > 42) return { error: "Project title is required and must be 42 characters or fewer." };
  if (!description || description.length > 180) return { error: "Description is required and must be 180 characters or fewer." };
  if (!(creatorType === "student" || creatorType === "teacher")) return { error: "Choose Student or Teacher as the creator type." };
  if (!studentName || studentName.length > 60) return { error: "Creator display name is required and must be 60 characters or fewer." };
  if (creatorType === "student" && (!gradeId || !classId)) return { error: "Grade and class are required for student projects." };
  if (creatorType === "teacher" && (!creatorRole || creatorRole.length > 60)) return { error: "Role or department is required for teacher projects and must be 60 characters or fewer." };
  if (!selectedCategories.length || selectedCategories.some((category) => !categories.includes(category as ProjectPayload["categories"][number]))) return { error: "Choose at least one approved project category." };
  if (!technologies.length || technologies.some((technology) => !technologyOptions.includes(technology as (typeof technologyOptions)[number]))) return { error: "Choose at least one approved technology." };
  if (!coverAlt) return { error: "Cover image alt text is required." };
  if (!(["html", "zip", "url"] as const).includes(sourceType as ProjectPayload["sourceType"])) return { error: "Choose a supported project source." };
  if (sourceType === "url") {
    if (!validateExternalProjectUrl(externalUrl ?? "")) return { error: "External projects require a public HTTPS address." };
  }

  return {
    data: {
      title,
      description,
      studentName,
      creatorType,
      creatorRole: creatorType === "teacher" ? creatorRole : null,
      gradeId,
      classId,
      categories: selectedCategories as ProjectPayload["categories"],
      technologies,
      coverAlt,
      sourceType: sourceType as ProjectPayload["sourceType"],
      externalUrl,
    },
  };
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "student-project";
}

export async function uniqueSlug(title: string, excludeId?: string) {
  const db = getDb();
  const base = slugify(title);
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix ? `${base}-${suffix + 1}` : base;
    const [match] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, candidate)).limit(1);
    if (!match || match.id === excludeId) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function ensureDefaultOptions() {
  const db = getDb();
  const grades = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
  const classes = classProgrammes.flatMap((programme) => classNumbers.map((number) => `${programme}${number}`));
  await db.insert(gradeOptions).values(grades.map((label, index) => ({ id: slugify(label), label, sortOrder: index }))).onConflictDoNothing();
  for (let offset = 0; offset < classes.length; offset += 12) {
    const batch = classes.slice(offset, offset + 12);
    await db.insert(classOptions).values(batch.map((label, index) => ({ id: slugify(label), label, sortOrder: offset + index }))).onConflictDoNothing();
  }
}

export async function getCatalogOptions() {
  await ensureDefaultOptions();
  const db = getDb();
  const [grades, classes] = await Promise.all([
    db.select().from(gradeOptions).where(eq(gradeOptions.active, true)).orderBy(asc(gradeOptions.sortOrder), asc(gradeOptions.label)),
    db.select().from(classOptions).where(eq(classOptions.active, true)).orderBy(asc(classOptions.sortOrder), asc(classOptions.label)),
  ]);
  return { grades, classes, categories, technologies: technologyOptions, classProgrammes, classNumbers };
}

export async function getPublicCatalogOptions() {
  return getCatalogOptions();
}

export async function getAdminCatalogOptions() {
  await ensureDefaultOptions();
  const db = getDb();
  const [grades, classes] = await Promise.all([
    db.select().from(gradeOptions).orderBy(asc(gradeOptions.sortOrder), asc(gradeOptions.label)),
    db.select().from(classOptions).orderBy(asc(classOptions.sortOrder), asc(classOptions.label)),
  ]);
  return { grades, classes, categories, technologies: technologyOptions, classProgrammes, classNumbers };
}

export async function catalogSelectionExists(gradeId: string, classId: string) {
  const db = getDb();
  const [[grade], [classOption]] = await Promise.all([
    db.select({ id: gradeOptions.id }).from(gradeOptions).where(eq(gradeOptions.id, gradeId)).limit(1),
    db.select({ id: classOptions.id }).from(classOptions).where(eq(classOptions.id, classId)).limit(1),
  ]);
  return Boolean(grade && classOption);
}

export async function getPublicProjects(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.trim();
  const category = searchParams.get("category")?.trim();
  const creator = searchParams.get("creator")?.trim();
  const grade = searchParams.get("grade")?.trim();
  const technology = searchParams.get("technology")?.trim();
  const sort = searchParams.get("sort") ?? "featured";
  const filters = [eq(projects.status, "published")];
  if (category && categories.includes(category as ProjectPayload["categories"][number])) filters.push(like(projects.categoriesJson, `%"${category}"%`));
  if (creator === "student" || creator === "teacher") filters.push(eq(projects.creatorType, creator));
  if (grade) filters.push(eq(projects.gradeId, grade));
  if (technology) filters.push(like(projects.technologiesJson, `%${technology.replaceAll("%", "").replaceAll("_", "")}%`));
  if (search) {
    const pattern = `%${search}%`;
    filters.push(or(like(projects.title, pattern), like(projects.studentName, pattern), like(projects.categoriesJson, pattern), like(projects.technologiesJson, pattern))!);
  }
  const order = sort === "title" ? [asc(projects.title)] : sort === "newest" ? [desc(projects.publishedAt)] : [desc(projects.featured), asc(projects.sortOrder), desc(projects.publishedAt)];
  const rows = await getDb().select().from(projects).where(and(...filters)).orderBy(...order).limit(60);
  return rows.map(serializeProject);
}

export async function getPublishedProjectBySlug(slug: string) {
  const db = getDb();
  const [project] = await db.select().from(projects).where(and(eq(projects.slug, slug), eq(projects.status, "published"))).limit(1);
  if (!project) return null;
  if (project.creatorType === "teacher") return { ...serializeProject(project), gradeLabel: "", classLabel: "" };
  const [[grade], [classOption]] = await Promise.all([
    db.select().from(gradeOptions).where(eq(gradeOptions.id, project.gradeId)).limit(1),
    db.select().from(classOptions).where(eq(classOptions.id, project.classId)).limit(1),
  ]);
  return { ...serializeProject(project), gradeLabel: grade?.label ?? project.gradeId, classLabel: classOption?.label ?? project.classId };
}
