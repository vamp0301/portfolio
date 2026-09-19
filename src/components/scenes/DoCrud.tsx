"use client";
import Scene from "@/components/ui/Scene";

const SOURCES = ["Greenhouse", "Lever", "Workday", "Ashby", "SmartRecruiters", "Workable"];

export default function DoCrud() {
  return (
    <Scene id="docrud">
      <div className="kicker" data-reveal>03 — DoCrud · job discovery platform</div>
      <h2 className="h-scene" data-reveal>Ten ATS providers in. <span className="grad">One clean feed out.</span></h2>
      <p className="lede" data-reveal>A multi-source scraper with normalization, fingerprint dedup and incremental updates, feeding a 0–100 match-scoring engine.</p>

      <svg className="diagram" viewBox="0 0 640 260" data-reveal>
        {SOURCES.map((s, i) => {
          const y = 22 + i * 40;
          return (
            <g key={s}>
              <rect className="node" x="4" y={y - 13} width="130" height="26" rx="8" />
              <text x="16" y={y + 4}>{s}</text>
              <path id={`src${i}`} className="wire" d={`M134 ${y} C 190 ${y}, 200 130, 250 130`} data-draw />
              <circle r="3" fill="var(--accent)" data-pulse={`#src${i}`} />
            </g>
          );
        })}
        <rect className="node node--hot" x="250" y="112" width="106" height="36" rx="9" />
        <text x="266" y="134">NORMALIZE</text>
        <path id="w1" className="wire wire--hot" d="M356 130 L 402 130" data-draw />
        <circle r="3" fill="var(--accent)" data-pulse="#w1" />
        <rect className="node node--hot" x="402" y="112" width="80" height="36" rx="9" />
        <text x="420" y="134">DEDUP</text>
        <path id="w2" className="wire wire--hot" d="M482 130 L 528 130" data-draw />
        <circle r="3" fill="var(--accent)" data-pulse="#w2" />
        <rect className="node node--hot" x="528" y="104" width="108" height="52" rx="9" />
        <text x="546" y="126">DATABASE</text>
        <text x="546" y="144" style={{ fill: "var(--ink-3)", fontSize: 10 }}>+ match scoring</text>
      </svg>

      <div className="stats" style={{ marginTop: 26 }}>
        <div className="bignum" data-reveal><span data-count="10" data-suffix="+">0</span><small>ATS providers</small></div>
        <div className="bignum" data-reveal><span data-count="100" data-suffix="K+">0</span><small>records validated</small></div>
        <div className="bignum" data-reveal><span data-count="600" data-suffix="+">0</span><small>registered users</small></div>
      </div>
    </Scene>
  );
}
