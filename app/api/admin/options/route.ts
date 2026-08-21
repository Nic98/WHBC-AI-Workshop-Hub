import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { gradeOptions, projects } from "@/db/schema";
import { assertSameOrigin, isAdminRequest } from "@/lib/auth";
import { slugify } from "@/lib/catalog";

type OptionType = "grade";

function readType(value: unknown): OptionType | null {
  return value === "grade" ? value : null;
}

function readLabel(value: unknown) {
  const label = typeof value === "string" ? value.trim() : "";
  return label && label.length <= 40 ? label : null;
}

async function authorized(request: Request) {
  return assertSameOrigin(request) && await isAdminRequest(request);
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const payload = (await request.json().catch(() => null)) as { type?: unknown; label?: unknown } | null;
  const type = readType(payload?.type);
  const label = readLabel(payload?.label);
  if (!type || !label) return Response.json({ error: "Enter a grade label of 40 characters or fewer." }, { status: 400 });
  const table = gradeOptions;
  const [duplicate] = await getDb().select({ id: table.id }).from(table).where(eq(table.label, label)).limit(1);
  if (duplicate) return Response.json({ error: "That option already exists." }, { status: 409 });
  const [last] = await getDb().select({ sortOrder: table.sortOrder }).from(table).orderBy(desc(table.sortOrder)).limit(1);
  let id = slugify(label);
  const [idMatch] = await getDb().select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
  if (idMatch) id = `${id}-${crypto.randomUUID().slice(0, 6)}`;
  const [option] = await getDb().insert(table).values({ id, label, sortOrder: (last?.sortOrder ?? -1) + 1 }).returning();
  return Response.json({ option }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await authorized(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const payload = (await request.json().catch(() => null)) as { type?: unknown; id?: unknown; label?: unknown; active?: unknown; sortOrder?: unknown } | null;
  const type = readType(payload?.type);
  const id = typeof payload?.id === "string" ? payload.id : "";
  if (!type || !id) return Response.json({ error: "The option is missing." }, { status: 400 });
  const table = gradeOptions;
  const [existing] = await getDb().select().from(table).where(eq(table.id, id)).limit(1);
  if (!existing) return Response.json({ error: "Option not found." }, { status: 404 });
  const label = payload?.label === undefined ? existing.label : readLabel(payload.label);
  if (!label) return Response.json({ error: "Enter a label of 40 characters or fewer." }, { status: 400 });
  if (label !== existing.label) {
    const [duplicate] = await getDb().select({ id: table.id }).from(table).where(eq(table.label, label)).limit(1);
    if (duplicate && duplicate.id !== id) return Response.json({ error: "That option already exists." }, { status: 409 });
  }
  const active = typeof payload?.active === "boolean" ? payload.active : existing.active;
  const sortOrder = Number.isSafeInteger(payload?.sortOrder) ? Number(payload?.sortOrder) : existing.sortOrder;
  const [option] = await getDb().update(table).set({ label, active, sortOrder }).where(eq(table.id, id)).returning();
  return Response.json({ option });
}

export async function DELETE(request: Request) {
  if (!(await authorized(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const payload = (await request.json().catch(() => null)) as { type?: unknown; id?: unknown } | null;
  const type = readType(payload?.type);
  const id = typeof payload?.id === "string" ? payload.id : "";
  if (!type || !id) return Response.json({ error: "The option is missing." }, { status: 400 });
  const table = gradeOptions;
  const [inUse] = await getDb().select({ id: projects.id }).from(projects).where(eq(projects.gradeId, id)).limit(1);
  if (inUse) return Response.json({ error: "This option is used by a project. Deactivate it instead." }, { status: 409 });
  await getDb().delete(table).where(eq(table.id, id));
  return Response.json({ ok: true });
}
