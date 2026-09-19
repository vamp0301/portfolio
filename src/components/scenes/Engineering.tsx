"use client";
import Scene from "@/components/ui/Scene";
import Chain from "@/components/ui/Chain";

export default function Engineering() {
  return (
    <Scene id="engineering">
      <div className="kicker" data-reveal>02 — Engineering</div>
      <h2 className="h-scene" data-reveal>I build backend-heavy systems <span className="grad">end to end</span>.</h2>
      <p className="lede" data-reveal>Multi-tenant SaaS, large-scale ingestion pipelines, and RAG/LLM services.</p>
      <div className="split split--top">
        <Chain items={[
          { label: "Node.js", note: "TypeScript, Express, Next.js API routes" },
          { label: "PostgreSQL", note: "Prisma, indexed, audited queries" },
          { label: "Redis", note: "tenant-aware caching" },
          { label: "Queues", note: "BullMQ, QStash workers" },
          { label: "AWS", note: "EC2 + PM2, Cloudflare R2" },
        ]} />
        <div className="glass glass--pad" data-reveal data-scan>
          <div className="mono small" style={{ letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 12 }}>Shipped at Corescent Technologies · Jul–Sep 2026</div>
          <ul className="recs">
            <li>DoCrud — job discovery platform, live at docrud.com</li>
            <li>WhatsCRM — multi-tenant WhatsApp CRM</li>
            <li>Renzo Salon ERP — multi-branch operations</li>
            <li>EduOS — multi-tenant university platform</li>
          </ul>
        </div>
      </div>
    </Scene>
  );
}
