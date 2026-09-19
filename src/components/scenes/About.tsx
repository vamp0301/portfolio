"use client";
import { useState } from "react";
import Scene from "@/components/ui/Scene";
import { PHOTO_URL } from "@/lib/config";
import type { Profile } from "@/lib/api";

const FALLBACK_ABOUT = [
  "I’m a backend-focused software engineer who enjoys turning complex ideas into reliable, scalable systems.",
  "I build production-oriented applications across backend engineering, full-stack development, AI/LLM integration, RAG systems, data pipelines, and cloud infrastructure.",
  "I’m particularly interested in how systems think, communicate, and scale.",
];

function emphasize(s: string) {
  // Bold the tech list in the fourth paragraph and the discipline list in the second.
  const bolds = ["backend engineering, full-stack development, AI/LLM integration, RAG systems, data pipelines, and cloud infrastructure", "Node.js, TypeScript, Next.js, PostgreSQL, MongoDB, Redis, Docker, AWS, Qdrant, Gemini, Groq, RAG, embeddings, and vector search", "how systems think, communicate, and scale", "architecture, security, performance, developer experience, and measurable impact"];
  for (const b of bolds) {
    const i = s.indexOf(b);
    if (i >= 0) return <>{s.slice(0, i)}<strong>{b}</strong>{s.slice(i + b.length)}</>;
  }
  return s;
}

export default function About({ p }: { p: Profile | null }) {
  const [photoOk, setPhotoOk] = useState(true);
  const about = p?.about ?? FALLBACK_ABOUT;
  return (
    <Scene id="about">
      <div className="about__grid">
        <div className={`glass photo ${photoOk ? "" : "photo--empty"}`} data-reveal data-scan>
          {photoOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={PHOTO_URL} alt="Gauransh Agarwal" onError={() => setPhotoOk(false)} />
          ) : (
            <div className="photo__ph">
              <span className="photo__mono">GA</span>
              <span>Save your portrait as<br /><code>web/public/avatar/photo.jpg</code></span>
            </div>
          )}
          <div className="photo__cap"><span>{p?.location ?? "Ghaziabad, India"}</span><span>est. 2023 →</span></div>
        </div>
        <div className="about">
          <div className="kicker" data-reveal>01 — About</div>
          <h2 className="h-scene" data-reveal>Behind the <span className="grad">interface</span>.</h2>
          {about.map((para, i) => (<p key={i} data-reveal>{emphasize(para)}</p>))}
          <blockquote className="quote" data-reveal>{p?.motto ?? "I don’t just build features. I build the systems behind them."}</blockquote>
          <div className="chips" data-reveal style={{ marginTop: 18 }}>
            {(p?.builds ?? ["Backend Systems", "AI/LLM Workflows", "RAG", "SaaS", "Data Pipelines"]).map((b) => <span key={b} className="chip">{b}</span>)}
          </div>
          <div className="meta" data-reveal>
            <span>{p?.education?.degree ?? "B.Tech CSE (Data Science)"} · {p?.education?.school ?? "AKGEC, Ghaziabad (AKTU)"} · {p?.education?.period ?? "2023 – 2027"}</span>
            <span><a href={`mailto:${p?.contact.email ?? "gauranshagarwal12345@gmail.com"}`}>{p?.contact.email ?? "gauranshagarwal12345@gmail.com"}</a> · {p?.contact.phone ?? "+91-63944-43659"}</span>
          </div>
        </div>
      </div>
    </Scene>
  );
}
