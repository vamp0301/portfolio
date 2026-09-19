"use client";
/**
 * Single source of truth for "which chapter am I in".
 *
 * Per-section ScrollTriggers raced each other (enter and enter-back both
 * firing during a jump), which left the avatar one station behind the text.
 * This picks the section whose centre is nearest the viewport centre, so the
 * answer is the same no matter how the visitor got there — wheel, keyboard,
 * anchor jump or a restored scroll position.
 */
import { useEffect } from "react";
import { avatar, SCENE_ORDER, type SceneId } from "@/lib/avatarStore";

export default function useSceneTracker() {
  useEffect(() => {
    let raf = 0;
    const pick = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let best: SceneId = SCENE_ORDER[0];
      let bestDist = Infinity;
      for (const id of SCENE_ORDER) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - mid);
        if (dist < bestDist) { bestDist = dist; best = id; }
      }
      // At the very bottom of the page the last section can still be "below"
      // centre; treat a page-end scroll as the finale so the avatar exits.
      const atEnd = window.scrollY + window.innerHeight >= document.body.scrollHeight - 4;
      avatar.go(atEnd ? SCENE_ORDER[SCENE_ORDER.length - 1] : best);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(pick); };
    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}
