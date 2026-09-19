"use client";
/**
 * Page-wide motion, applied to every chapter without touching their markup:
 *  - a thin progress line across the top that fills as you scroll
 *  - `is-inview` on each chapter while it is on screen, which starts its CSS
 *    animations (travelling signals, growing bars) only when seen
 *  - depth parallax: kicker, heading and caption drift at different rates
 *  - a soft 3D tilt toward the cursor on cards and panels (fine pointers only)
 * Nothing runs for visitors who prefer reduced motion.
 */
import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const TILT = ".glass, .layer, .work__row, .traits li";

export default function Motion() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: (() => void)[] = [];

    /* in-view flags — used by the CSS animations */
    const sections = document.querySelectorAll<HTMLElement>("[data-section]");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("is-inview", e.isIntersecting)),
      { threshold: 0.18 }
    );
    sections.forEach((s) => io.observe(s));
    cleanups.push(() => io.disconnect());
    if (reduce) {
      sections.forEach((s) => s.classList.add("is-inview"));
      return () => cleanups.forEach((c) => c());
    }

    /* scroll progress */
    const bar = document.querySelector<HTMLElement>(".progress i");
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = document.documentElement.scrollHeight - innerHeight;
        if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      });
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    cleanups.push(() => removeEventListener("scroll", onScroll));

    /* depth parallax */
    const ctx = gsap.context(() => {
      sections.forEach((sec) => {
        const layers: [string, number][] = [[".kicker", 26], [".h-scene", 16], [".scene__line", 10]];
        for (const [sel, px] of layers) {
          const el = sec.querySelector<HTMLElement>(sel);
          if (!el) continue;
          // The reveal animates `y`; parallax drives `yPercent`, which GSAP
          // composes separately, so the two never fight over one property.
          const h = Math.max(12, el.offsetHeight);
          gsap.fromTo(el, { yPercent: 0 }, {
            yPercent: (-px / h) * 100, ease: "none",
            scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: 0.6 },
          });
        }
      });
    });
    cleanups.push(() => ctx.revert());
    ScrollTrigger.refresh();

    /* hover tilt */
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const onMove = (e: PointerEvent) => {
        const el = (e.target as Element | null)?.closest<HTMLElement>(TILT);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, { rotationY: px * 5, rotationX: -py * 5, transformPerspective: 1000, duration: 0.45, ease: "power2.out", overwrite: "auto" });
        el.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
        el.style.setProperty("--my", `${(py + 0.5) * 100}%`);
      };
      const onOut = (e: PointerEvent) => {
        const el = (e.target as Element | null)?.closest<HTMLElement>(TILT);
        if (!el || el.contains(e.relatedTarget as Node)) return;
        gsap.to(el, { rotationY: 0, rotationX: 0, duration: 0.7, ease: "power3.out", overwrite: "auto" });
      };
      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerout", onOut, { passive: true });
      cleanups.push(() => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerout", onOut);
      });
    }

    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div className="progress" aria-hidden>
      <i />
    </div>
  );
}
