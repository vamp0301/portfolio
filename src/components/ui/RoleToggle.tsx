"use client";
/**
 * A small heading on the landing page: "Working to become a" above a bold
 * role that changes one by one — Backend Engineer, Full-Stack Builder,
 * Prompt Engineer. Each change also lights that role's skill bubbles around
 * the avatar. Screen readers get all three roles once, not a live ticker.
 */
import { useEffect, useSyncExternalStore } from "react";
import { avatar } from "@/lib/avatarStore";
import { ROLES } from "@/lib/skills";

const EVERY_MS = 2400;

export default function RoleToggle() {
  const snap = useSyncExternalStore(avatar.subscribe, avatar.getSnapshot, avatar.getSnapshot);

  useEffect(() => {
    const id = window.setInterval(() => {
      const i = ROLES.findIndex((r) => r.id === avatar.role);
      avatar.setRole(ROLES[(i + 1) % ROLES.length].id, false);
    }, EVERY_MS);
    return () => window.clearInterval(id);
  }, []);

  const i = Math.max(0, ROLES.findIndex((r) => r.id === snap.role));
  const prev = (i + ROLES.length - 1) % ROLES.length;

  return (
    <div className="become" data-reveal>
      <span className="become__lead">Working to become a</span>
      <span className="become__words" aria-hidden>
        {ROLES.map((r, k) => (
          <b key={r.id} className={k === i ? "is-on" : k === prev ? "is-out" : ""}>{r.label}</b>
        ))}
      </span>
      <span className="sr-only">{ROLES.map((r) => r.label).join(", ")}</span>
    </div>
  );
}
