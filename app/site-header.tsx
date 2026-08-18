import Link from "next/link";

type PublicPage = "home" | "projects" | "about" | "privacy";

export function SiteHeader({ active }: { active?: PublicPage }) {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="AI Workshop Hub home">AI WORKSHOP HUB</Link>
      <nav aria-label="Primary navigation">
        <Link aria-current={active === "home" ? "page" : undefined} className={active === "home" ? "nav-active" : undefined} href="/">Home</Link>
        <Link aria-current={active === "projects" ? "page" : undefined} className={active === "projects" ? "nav-active" : undefined} href="/projects">Projects</Link>
        <Link aria-current={active === "about" ? "page" : undefined} className={active === "about" ? "nav-active" : undefined} href="/about">About</Link>
        <Link aria-current={active === "privacy" ? "page" : undefined} className={active === "privacy" ? "nav-active" : undefined} href="/privacy">Privacy</Link>
      </nav>
      <Link aria-label="Administrator sign in" className="admin-link" href="/admin" title="Admin">🔐</Link>
    </header>
  );
}
