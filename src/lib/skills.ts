/**
 * Skills. Every technical skill below is copied from the résumé
 * (backend/config/profile.js), group by group, with only long names shortened
 * for display (e.g. "Qdrant (Vector DB)" -> "Qdrant"). Character traits are
 * listed only with the résumé evidence that backs them.
 */
export interface Orbit {
  id: string;
  label: string;
  /** a soft hue from the site palette */
  color: string;
  skills: string[];
}

export interface Trait {
  trait: string;
  evidence: string;
}

export const CHARACTER: Trait[] = [
  { trait: "Ownership", evidence: "Shipped four production platforms end to end at Corescent" },
  { trait: "Security mindset", evidence: "Found and fixed 19 cross-branch authorization flaws" },
  { trait: "Test discipline", evidence: "2,500+ tests on EduOS; 54/54 regression on Renzo" },
  { trait: "Performance focus", evidence: "~5.8× faster document uploads on WhatsCRM" },
  { trait: "Problem solving", evidence: "CodeChef 2★, 200+ problems in rated contests" },
];

/** Every résumé skill group, plus character. Order matters for the opening:
 *  AI and languages fill the skull, character the spine, then arms, then legs. */
export const ORBITS: Orbit[] = [
  { id: "ai", label: "AI / GenAI", color: "#c9a6f2", skills: ["Gemini", "Groq", "RAG", "Embeddings", "Vector search", "Prompt engineering"] },
  { id: "languages", label: "Languages", color: "#9fb6da", skills: ["TypeScript", "JavaScript", "C++", "Python", "SQL", "HTML/CSS"] },
  { id: "character", label: "Character", color: "#eeaac4", skills: CHARACTER.map((c) => c.trait) },
  { id: "backend", label: "Backend", color: "#7fd0da", skills: ["Node.js", "Express.js", "Next.js API Routes", "REST APIs", "WebSockets", "BullMQ", "QStash", "Queue-based processing"] },
  { id: "data", label: "Data", color: "#a9a4f0", skills: ["PostgreSQL", "MongoDB", "MySQL", "Prisma", "Mongoose", "Redis", "Qdrant", "Query optimization"] },
  { id: "frontend", label: "Frontend", color: "#95d6b4", skills: ["React", "Next.js", "Tailwind CSS", "Accessible UI"] },
  { id: "cloud", label: "Cloud & security", color: "#e9c38f", skills: ["AWS EC2", "Vercel", "Docker", "PM2", "Cloudflare R2", "JWT", "NextAuth", "RBAC", "Multi-tenant isolation", "Zod"] },
];

/** Every skill, flat, with its group — the opening uses all of them. */
export const ALL_SKILLS = ORBITS.flatMap((o) => o.skills.map((skill) => ({ skill, group: o.id, color: o.color })));

/* ── Roles, for the rotating heading on the landing page ─────────────────
 * `skills` names the bubbles each role lights up around the avatar. */
export type RoleId = "backend" | "fullstack" | "prompt";

export interface Role {
  id: RoleId;
  label: string;
  skills: string[];
}

export const ROLES: Role[] = [
  { id: "backend", label: "Backend Engineer", skills: ["Node.js", "TypeScript", "PostgreSQL", "Redis", "Ownership", "Security mindset"] },
  { id: "fullstack", label: "Full-Stack Builder", skills: ["Next.js", "TypeScript", "PostgreSQL", "Docker", "Ownership"] },
  { id: "prompt", label: "Prompt Engineer", skills: ["RAG", "Qdrant", "Gemini", "Groq"] },
];

/** Bubbles beside the landing-page avatar after the opening, in slot order:
 *  two rows by the head, one at the chest, three by the arms. */
export const HERO_BUBBLES: { skill: string; group: string }[] = [
  { skill: "RAG", group: "ai" }, { skill: "Gemini", group: "ai" },
  { skill: "Qdrant", group: "data" }, { skill: "Groq", group: "ai" },
  { skill: "Ownership", group: "character" }, { skill: "Security mindset", group: "character" },
  { skill: "Node.js", group: "backend" }, { skill: "TypeScript", group: "languages" },
  { skill: "PostgreSQL", group: "data" }, { skill: "Redis", group: "data" },
  { skill: "Next.js", group: "frontend" }, { skill: "Docker", group: "cloud" },
];
