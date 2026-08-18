import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div><Link className="wordmark" href="/">AI WORKSHOP HUB</Link><p><span>A student AI project community.</span><span lang="zh-CN">学生 AI 项目交流社区</span></p></div>
      <nav aria-label="Footer navigation"><Link href="/">Home</Link><Link href="/projects">Projects</Link><Link href="/about">About</Link><Link href="/privacy">Privacy</Link></nav>
      <small>Wuhan Britain-China School · © {new Date().getFullYear()}</small>
    </footer>
  );
}
