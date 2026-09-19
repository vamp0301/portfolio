"use client";
import { useSyncExternalStore } from "react";
import { avatar } from "@/lib/avatarStore";

const MENU: [string, string][] = [
  ["about", "About"],
  ["engineering", "Systems"],
  ["security", "Security"],
  ["rag", "AI / RAG"],
  ["achievements", "Live"],
  ["ats", "ATS"],
  ["finale", "Contact"],
];

/** Chapters that light a menu item other than their own. */
const MAPS: Record<string, string> = { hero: "about", docrud: "engineering", fingerprint: "rag" };

export default function Nav() {
  const snap = useSyncExternalStore(avatar.subscribe, avatar.getSnapshot, avatar.getSnapshot);
  return (
    <>
      <header className="nav">
        <a className="nav__brand" href="#hero">
          GAURANSH AGARWAL
          <small>Backend · Full-Stack · Prompt</small>
        </a>
        <nav className="nav__menu glass" aria-label="Chapters">
          {MENU.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={(MAPS[snap.scene] ?? snap.scene) === id ? "is-active" : ""}>{label}</a>
          ))}
        </nav>
        <a className="btn btn--solid nav__hire" href="#finale">Hire me</a>
      </header>
    </>
  );
}
