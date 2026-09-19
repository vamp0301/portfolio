"use client";
/**
 * The skill atom chapter. Gauransh is the nucleus; every skill on the résumé
 * orbits him on one of three rings — backend & data, AI & cloud, character —
 * crossed at 60 degrees like the classic atom. Labels stay upright, and the
 * far side of each orbit dims and shrinks so the rings read as depth.
 * Character traits are listed underneath with the résumé evidence for each.
 */
import { useEffect, useRef } from "react";
import Scene from "@/components/ui/Scene";
import { CHARACTER, ORBITS } from "@/lib/skills";

/** Orbit geometry, in % of the square stage. */
const RX = 44, RY = 15;
const ROT = [0, 60, 120];
const SPEED = [0.16, -0.13, 0.1];

export default function Fingerprint() {
  const stage = useRef<HTMLDivElement>(null);
  const pills = useRef<(HTMLSpanElement | null)[][]>(ORBITS.map(() => []));

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 });
    io.observe(el);
    const t0 = performance.now();
    let raf = 0;
    const place = (now: number) => {
      const t = reduce ? 0 : (now - t0) / 1000;
      ORBITS.forEach((o, i) => {
        const phi = (ROT[i] * Math.PI) / 180;
        o.skills.forEach((_, j) => {
          const p = pills.current[i][j];
          if (!p) return;
          const th = t * SPEED[i] + (j / o.skills.length) * Math.PI * 2 + i * 0.7;
          const x = Math.cos(th) * RX, y = Math.sin(th) * RY;
          const X = x * Math.cos(phi) - y * Math.sin(phi);
          const Y = x * Math.sin(phi) + y * Math.cos(phi);
          const front = (Math.sin(th) + 1) / 2; // near side of the orbit
          p.style.left = `${50 + X}%`;
          p.style.top = `${50 + Y}%`;
          p.style.opacity = String(0.34 + 0.66 * front);
          p.style.transform = `translate(-50%, -50%) scale(${0.84 + 0.24 * front})`;
          p.style.zIndex = String(front > 0.5 ? 3 : 1);
        });
      });
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (visible) place(now);
    };
    place(t0);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <Scene id="fingerprint">
      <div className="kicker" data-reveal>07 — Skill atom</div>
      <h2 className="h-scene" data-reveal>Every skill, <span className="grad">one core</span>.</h2>

      <div className="atom" ref={stage} data-reveal>
        <svg className="atom__rings" viewBox="0 0 100 100" aria-hidden>
          {ORBITS.map((o, i) => (
            <ellipse key={o.id} cx="50" cy="50" rx={RX} ry={RY} transform={`rotate(${ROT[i]} 50 50)`} style={{ stroke: o.color }} />
          ))}
        </svg>
        <div className="atom__nucleus"><span>Gauransh</span></div>
        {ORBITS.map((o, i) =>
          o.skills.map((s, j) => (
            <span
              key={o.id + s}
              ref={(el) => { pills.current[i][j] = el; }}
              className="atom__pill"
              style={{ ["--c" as string]: o.color } as React.CSSProperties}
            >
              {s}
            </span>
          ))
        )}
      </div>

      <div className="atom__legend" data-reveal>
        {ORBITS.map((o) => (
          <span key={o.id} className="orbit-key" style={{ ["--c" as string]: o.color } as React.CSSProperties}>
            <i aria-hidden />{o.label}
          </span>
        ))}
      </div>

      <ul className="traits" data-reveal>
        {CHARACTER.map((c) => (
          <li key={c.trait}>
            <b>{c.trait}</b>
            <span>{c.evidence}</span>
          </li>
        ))}
      </ul>
    </Scene>
  );
}
