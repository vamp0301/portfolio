"use client";
import Scene from "@/components/ui/Scene";

const STEPS = ["USER", "TENANT", "BRANCH", "RESOURCE"];

export default function Security() {
  return (
    <Scene id="security">
      <div className="kicker" data-reveal>04 — Security · Renzo Salon ERP</div>
      <h2 className="h-scene" data-reveal>The <span className="grad">access-control gate</span>.</h2>
      <p className="lede" data-reveal>I reviewed every branch-scoped route, found the authorization and IDOR flaws, and enforced branch-scoped RBAC.</p>

      <div className="split">
        <div className="gate glass glass--pad" data-reveal data-scan>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "grid", justifyItems: "center", gap: 8 }}>
              <div className="gate__step" data-reveal style={{ ["--i" as string]: i } as React.CSSProperties}>{s}</div>
              <div className="gate__arrow" data-reveal />
            </div>
          ))}
          <div className="gate__step gate__step--ok" data-reveal>ALLOWED ✓</div>
        </div>
        <div style={{ display: "grid", gap: 26 }}>
          <div className="bignum" data-reveal><span data-count="19">0</span><small>cross-branch authorization flaws found &amp; fixed</small></div>
          <div className="bignum" data-reveal><span data-count="14">0</span><span style={{ opacity: 0.4 }}> / </span>14<small>attacks blocked in verification</small></div>
          <div className="chips" data-reveal>
            {["54/54 regression", "36/36 reconciliation", "22/22 payment RBAC"].map((c) => <span key={c} className="chip chip--on">{c}</span>)}
          </div>
        </div>
      </div>
    </Scene>
  );
}
