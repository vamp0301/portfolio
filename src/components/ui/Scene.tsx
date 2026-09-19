"use client";
/**
 * A full-viewport chapter. When it scrolls into view it sends the avatar to
 * its station, reveals its content, draws its wires and counts its numbers.
 */
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { STATIONS, type SceneId } from "@/lib/avatarStore";

interface Props {
  id: SceneId;
  className?: string;
  /** render the avatar's line as a caption above the content (default) */
  caption?: boolean;
  children: React.ReactNode;
}

export default function Scene({ id, className = "", caption = true, children }: Props) {
  const ref = useRef<HTMLElement>(null!);
  const side = STATIONS[id].side;

  useGSAP(
    () => {
      const el = ref.current;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 70%", toggleActions: "play none none reverse" },
        defaults: { ease: "power3.out" },
      });

      const reveals = el.querySelectorAll<HTMLElement>("[data-reveal]");
      if (reveals.length) {
        tl.fromTo(reveals, { y: reduce ? 0 : 28, opacity: 0, filter: "blur(6px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, stagger: 0.08 }, 0);
      }
      const panels = el.querySelectorAll<HTMLElement>("[data-scan]");
      panels.forEach((p, i) => {
        tl.fromTo(p, { "--scan": "-20%" } as gsap.TweenVars, { "--scan": "120%", duration: 1.4, ease: "power2.inOut" } as gsap.TweenVars, 0.2 + i * 0.1);
      });
      const wires = el.querySelectorAll<SVGPathElement | SVGLineElement>("[data-draw]");
      wires.forEach((w, i) => {
        const len = "getTotalLength" in w ? (w as SVGPathElement).getTotalLength() : 300;
        gsap.set(w, { strokeDasharray: len, strokeDashoffset: len });
        tl.to(w, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, 0.3 + i * 0.12);
      });
      const pulses = el.querySelectorAll<SVGCircleElement>("[data-pulse]");
      pulses.forEach((c) => {
        const pathSel = c.dataset.pulse!;
        const path = el.querySelector<SVGPathElement>(pathSel);
        if (!path || reduce) return;
        const len = path.getTotalLength();
        const state = { t: 0 };
        gsap.to(state, {
          t: 1, duration: 2.2 + Math.random(), repeat: -1, ease: "none", delay: Math.random(),
          onUpdate: () => { const p = path.getPointAtLength(state.t * len); c.setAttribute("cx", String(p.x)); c.setAttribute("cy", String(p.y)); },
        });
      });
      const nums = el.querySelectorAll<HTMLElement>("[data-count]");
      nums.forEach((n, i) => {
        const target = Number(n.dataset.count);
        const suffix = n.dataset.suffix || "";
        const decimals = Number(n.dataset.decimals || 0);
        const o = { v: 0 };
        tl.to(o, {
          v: target, duration: 1.6, ease: "power2.out",
          onUpdate: () => { n.textContent = o.v.toFixed(decimals) + suffix; },
        }, 0.4 + i * 0.15);
      });
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      id={id}
      data-section={id}
      className={`scene ${side === "center" ? "scene--center" : ""} ${className}`}
    >
      <div className={`scene__grid scene__grid--${side === "center" ? "center" : side}`}>
        <div className="scene__body">
          {/* The avatar's line, as a fixed caption under the chapter rule.
              It used to float over the model's face; a caption in the same
              place every chapter reads as narration, not as a speech bubble. */}
          {caption && <p className="scene__line" data-reveal>{STATIONS[id].line}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
