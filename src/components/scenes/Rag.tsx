"use client";
import Scene from "@/components/ui/Scene";
import Chain from "@/components/ui/Chain";

export default function Rag() {
  return (
    <Scene id="rag">
      <div className="kicker" data-reveal>05 — AI / RAG · WhatsCRM</div>
      <h2 className="h-scene" data-reveal>Documents in. <span className="grad">Grounded answers out.</span></h2>
      <p className="lede" data-reveal>A RAG knowledge base on Qdrant with chunking, batched embeddings and idempotent indexing, isolated per business. Indexing runs on async QStash workers.</p>
      <div className="split">
        <Chain items={[
          { label: "DOCUMENT" }, { label: "CHUNKING" }, { label: "EMBEDDINGS", note: "batched, retried" },
          { label: "QDRANT", note: "per-business isolation" }, { label: "RETRIEVAL" }, { label: "LLM", note: "Gemini / Groq" }, { label: "ANSWER" },
        ]} />
        <div style={{ display: "grid", gap: 22 }}>
          <div className="bignum" data-reveal>~<span data-count="5.8" data-decimals="1" data-suffix="×">0</span><small>measured upload-latency improvement (150-chunk document)</small></div>
          <div className="glass glass--pad" data-reveal data-scan>
            <div className="mono small" style={{ letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 10 }}>Also in the lab</div>
            <p className="small" style={{ margin: 0 }}>GenAI Interview Assistant — prompt chaining on Gemini 1.5 Flash, 3.5s → 2.8s over 50+ test queries. EduOS — Groq-backed AI service, 2,500+ tests passing.</p>
          </div>
        </div>
      </div>
    </Scene>
  );
}
