import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminPageSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminPageSession().catch(() => false)) redirect("/admin");
  return (
    <main className="admin-login-page">
      <Link className="wordmark" href="/">AI WORKSHOP HUB</Link>
      <section className="login-panel">
        <span className="eyebrow">ADMIN WORKSPACE</span>
        <h1>Welcome back.</h1>
        <p>Sign in to prepare, preview, and publish student projects.</p>
        <LoginForm />
        <Link className="back-link" href="/">← Back to the gallery</Link>
      </section>
    </main>
  );
}
