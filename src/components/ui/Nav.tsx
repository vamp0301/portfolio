"use client";
/**
 * Top navigation. On wide screens the chapters sit in a glass pill; below
 * 900px they move into a full-screen sheet behind a menu button, so every
 * chapter stays one tap away on a phone.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { avatar } from "@/lib/avatarStore";

const MENU: [string, string][] = [
  ["about", "About"],
  ["engineering", "Systems"],
  ["security", "Security"],
  ["rag", "AI / RAG"],
  ["achievements", "Live"],
  ["fingerprint", "Skills"],
  ["ats", "ATS"],
  ["finale", "Contact"],
];

/** Chapters that light a menu item other than their own. */
const MAPS: Record<string, string> = { hero: "about", docrud: "engineering" };

export default function Nav() {
  const snap = useSyncExternalStore(avatar.subscribe, avatar.getSnapshot, avatar.getSnapshot);
  const [open, setOpen] = useState(false);
  const current = MAPS[snap.scene] ?? snap.scene;

  // Close on Escape, and stop the page scrolling behind the open sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <header className="nav">
        <a className="nav__brand" href="#hero">
          GAURANSH AGARWAL
          <small>Backend · Full-Stack · Prompt</small>
        </a>
        <nav className="nav__menu glass" aria-label="Chapters">
          {MENU.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={current === id ? "is-active" : ""}>{label}</a>
          ))}
        </nav>
        <div className="nav__end">
          <a className="btn btn--solid nav__hire" href="#finale">Hire me</a>
          <button
            type="button"
            className="nav__toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="nav-sheet"
            onClick={() => setOpen((o) => !o)}
          >
            <i /><i />
          </button>
        </div>
      </header>

      <div id="nav-sheet" className={`nav-sheet ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <nav aria-label="Chapters">
          {MENU.map(([id, label], i) => (
            <a
              key={id}
              href={`#${id}`}
              tabIndex={open ? 0 : -1}
              className={current === id ? "is-active" : ""}
              style={{ ["--i" as string]: i } as React.CSSProperties}
              onClick={() => setOpen(false)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>{label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
