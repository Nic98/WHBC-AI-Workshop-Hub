"use client";

import { useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

export function ShareControls({ title }: { title: string }) {
  const [notice, setNotice] = useState("");
  const [qr, setQr] = useState("");

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, text: `Explore ${title} on AI Workshop Hub`, url }).catch(() => undefined);
      return;
    }
    await copy();
  }
  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setNotice("Link copied"); window.setTimeout(() => setNotice(""), 1800);
  }
  async function toggleQr() {
    if (qr) return setQr("");
    setQr(await QRCode.toDataURL(window.location.href, { width: 196, margin: 1, color: { dark: "#111111", light: "#ffffff" } }));
  }

  return <div className="share-controls"><span className="share-label">SHARE PROJECT</span><div><button onClick={() => void share()}>Share ↗</button><button onClick={() => void copy()}>Copy link</button><button aria-expanded={Boolean(qr)} onClick={() => void toggleQr()}>QR code</button></div>{notice ? <small role="status">{notice}</small> : null}{qr ? <div className="share-qr"><Image unoptimized width={196} height={196} src={qr} alt={`QR code for ${title}`} /><span>Scan to open this project</span></div> : null}</div>;
}
