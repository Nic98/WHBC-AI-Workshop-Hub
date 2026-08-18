import { redirect } from "next/navigation";
import { isAdminPageSession } from "@/lib/auth";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminPageSession().catch(() => false))) redirect("/admin/login");
  return <AdminDashboard />;
}
