import { getPublicCatalogOptions, getPublicProjects } from "@/lib/catalog";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const [projects, options] = await Promise.all([getPublicProjects(url.searchParams), getPublicCatalogOptions()]);
    return Response.json({ projects, options }, { headers: { "cache-control": "public, max-age=30" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Projects are temporarily unavailable.";
    return Response.json({ error: message }, { status: 500 });
  }
}
