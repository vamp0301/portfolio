"use client";
import { useState } from "react";
import Scene from "@/components/ui/Scene";
import { api, type AtsResult } from "@/lib/api";

const SAMPLE = `Backend Engineer (Node.js / TypeScript)
We're looking for a backend engineer to design REST APIs, work with PostgreSQL and Redis, and ship on AWS with Docker. Experience with queues (BullMQ/Kafka), multi-tenant SaaS, RBAC and RAG/LLM features is a plus. Bachelor's in Computer Science preferred. 1+ years of experience.`;

function Dial({ v }: { v: number }) {
  const r = 62, c = 2 * Math.PI * r;
  return (
    <div className="dial">
      <svg viewBox="0 0 150 150">
        <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx="75" cy="75" r={r} fill="none" stroke="url(#wireGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <b>{v}</b>
      <small>/ 100</small>
    </div>
  );
}

export default function AtsEngine() {
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<AtsResult | null>(null);

  const run = async (text: string) => {
    setBusy(true); setErr(""); setRes(null);
    try { setRes(await api.ats(text)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const bars: [string, number, string][] = res ? [
    ["Keywords", res.keywordMatch, res.explanation.keywordMatch],
    ["Skills", res.skillMatch, res.explanation.skillMatch],
    ["Experience", res.experienceMatch, res.explanation.experienceMatch],
    ["Projects", res.projectMatch, res.explanation.projectMatch],
    ["Education", res.educationMatch, res.explanation.educationMatch],
    ["Role fit", res.roleMatch, res.explanation.roleMatch],
  ] : [];

  return (
    <Scene id="ats">
      <div className="kicker" data-reveal>08 — ATS engine</div>
      <h2 className="h-scene" data-reveal>Resume <span className="grad">analyzer</span>.</h2>
      <p className="lede" data-reveal>DoCrud’s scoring idea, pointed at me. Paste a job description and a deterministic matcher scores it against my résumé. No LLM in the loop.</p>

      <div className="ats">
        <form className="glass glass--pad form ats__form" data-reveal data-scan onSubmit={(e) => { e.preventDefault(); run(jd); }}>
          <div className="field">
            <label htmlFor="jd">Job description</label>
            <textarea id="jd" rows={6} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the role here…" />
          </div>
          <div className="btn-row">
            <button className="btn" type="submit" disabled={busy || jd.trim().length < 40}>{busy ? "Scoring…" : "Run match engine"}</button>
            <button className="btn btn--ghost" type="button" onClick={() => { setJd(SAMPLE); run(SAMPLE); }} disabled={busy}>Try a sample</button>
          </div>
          <div className={`status ${err ? "err" : ""}`}>{err || (res ? `${res.label} · ${res.method}` : "JOB DESCRIPTION + RÉSUMÉ → MATCH ENGINE → ATS ANALYSIS")}</div>
        </form>

        <div className="glass glass--pad" data-reveal data-scan style={{ display: "grid", gap: 16 }}>
          {!res ? (
            <div className="small" style={{ minHeight: 130, display: "grid", placeContent: "center", textAlign: "center" }}>
              <div className="mono" style={{ letterSpacing: ".2em", color: "var(--ink-3)" }}>AWAITING INPUT</div>
              <div style={{ marginTop: 8 }}>Scores are keyword and skill overlap, labelled “Portfolio ATS Compatibility Score”. They are not a hiring probability.</div>
            </div>
          ) : (
            <>
              <div className="score">
                <Dial v={res.overallScore} />
                <div>
                  <div className="mono small" style={{ letterSpacing: ".18em", textTransform: "uppercase" }}>{res.label}</div>
                  <div className="bars" style={{ marginTop: 10 }}>
                    {bars.map(([k, v, why]) => (
                      <div className="bar" key={k} title={why}><span>{k}</span><i><b style={{ width: `${v}%` }} /></i><span>{v}</span></div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="mono small" style={{ letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 8 }}>Matched</div>
                <div className="chips">{res.matchedSkills.map((s) => <span key={s} className="chip chip--on">✓ {s}</span>)}{!res.matchedSkills.length && <span className="small">none</span>}</div>
              </div>
              <div>
                <div className="mono small" style={{ letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 8 }}>Missing</div>
                <div className="chips">{res.missingSkills.map((s) => <span key={s} className="chip chip--off">✗ {s}</span>)}{!res.missingSkills.length && <span className="small">nothing flagged</span>}</div>
              </div>
              <div>
                <div className="mono small" style={{ letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 8 }}>Read-out</div>
                <ul className="recs">{res.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
              <details className="expl">
                <summary className="mono small" style={{ cursor: "pointer", letterSpacing: ".18em", textTransform: "uppercase" }}>Why each score</summary>
                {Object.entries(res.explanation).map(([k, v]) => <div key={k}><b>{k}</b><br />{v}</div>)}
              </details>
              <p className="small" style={{ margin: 0 }}>{res.disclaimer}</p>
            </>
          )}
        </div>
      </div>
    </Scene>
  );
}
