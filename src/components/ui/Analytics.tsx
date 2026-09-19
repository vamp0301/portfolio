"use client";
/**
 * Honest, disclosed analytics (same contract as the legacy site): a
 * first-party session id and per-chapter dwell time, sent with sendBeacon.
 */
import { useEffect } from "react";
import { API_BASE, sessionId } from "@/lib/api";

export default function Analytics() {
  useEffect(() => {
    const SID = sessionId();
    if (!SID) return;
    const send = (payload: Record<string, unknown>) => {
      const body = JSON.stringify({ sessionId: SID, path: location.pathname, referrer: document.referrer, ...payload });
      try {
        if (navigator.sendBeacon) navigator.sendBeacon(`${API_BASE}/api/track`, new Blob([body], { type: "application/json" }));
        else fetch(`${API_BASE}/api/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
      } catch {}
    };
    const enter = new Map<string, number>();
    const flush = (s: string) => {
      const t0 = enter.get(s);
      if (t0 == null) return;
      enter.delete(s);
      const dwellMs = Date.now() - t0;
      if (dwellMs > 700) send({ section: s, dwellMs });
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const name = (e.target as HTMLElement).dataset.section!;
        if (e.isIntersecting) enter.set(name, Date.now()); else flush(name);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll("[data-section]").forEach((s) => io.observe(s));
    const flushAll = () => enter.forEach((_, k) => flush(k));
    window.addEventListener("pagehide", flushAll);
    const vis = () => { if (document.visibilityState === "hidden") flushAll(); };
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); window.removeEventListener("pagehide", flushAll); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return null;
}
