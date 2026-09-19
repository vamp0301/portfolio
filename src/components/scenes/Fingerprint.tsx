"use client";
/**
 * Chapter 07: every skill as a bubble, floating gently in place around a
 * "Gauransh" core — nothing orbits. Bubbles are coloured by group (backend &
 * data, AI & cloud, character) and wrap naturally at any screen width.
 * Character traits are listed underneath with the résumé evidence for each.
 */
import Scene from "@/components/ui/Scene";
import { CHARACTER, ORBITS } from "@/lib/skills";

/** Stable pseudo-random in [0, 1) from a string, so sizes never reshuffle. */
const rand = (s: string, salt = 0) => {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

export default function Fingerprint() {
  const all = ORBITS.flatMap((o) => o.skills.map((s) => ({ skill: s, orbit: o })));
  const mid = Math.floor(all.length / 2);
  return (
    <Scene id="fingerprint">
      <div className="kicker" data-reveal>07 — Skill bubbles</div>
      <h2 className="h-scene" data-reveal>Every skill, <span className="grad">one core</span>.</h2>

      <div className="cloud" data-reveal>
        {all.map(({ skill, orbit }, i) => {
          const big = orbit.id === "character";
          // Size each bubble so its longest word fits inside the circle at a
          // readable size (about 60% of the font per character, 78% of the
          // diameter usable at mid-height), with a little variety on top.
          const longest = Math.max(...skill.split(/[\s-]/).map((wd) => wd.length));
          const font = 10.5;
          const fit = (font * 0.6 * longest + 12) / 0.78;
          const size = Math.round(Math.max(big ? 72 : 54, fit) + rand(skill) * 10);
          return (
            <span
              key={orbit.id + skill}
              className="cloud__bubble"
              style={{
                ["--c" as string]: orbit.color,
                ["--d" as string]: `${size}px`,
                ["--fk" as string]: (font / size).toFixed(4),
                ["--dur" as string]: `${5 + rand(skill, 7) * 3.5}s`,
                ["--delay" as string]: `${-rand(skill, 3) * 6}s`,
                order: i < mid ? i : i + 1,
              } as React.CSSProperties}
            >
              {skill}
            </span>
          );
        })}
        <span className="cloud__core" style={{ order: mid }}>Gauransh</span>
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
