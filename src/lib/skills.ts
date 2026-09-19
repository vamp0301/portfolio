/**
 * The skill atom. Every entry comes from the résumé (backend/config/profile.js).
 * Character traits are listed only with the résumé evidence that backs them,
 * so nothing here is a claim without a source.
 */
export interface Orbit {
  id: "backend" | "ai" | "character";
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

export const ORBITS: Orbit[] = [
  {
    id: "backend",
    label: "Backend & data",
    color: "#7fd0da",
    skills: ["Node.js", "TypeScript", "Express", "PostgreSQL", "MongoDB", "Redis", "BullMQ", "Prisma"],
  },
  {
    id: "ai",
    label: "AI & cloud",
    color: "#b3aaf2",
    skills: ["RAG", "Qdrant", "Embeddings", "Gemini", "Groq", "Next.js", "AWS EC2", "Docker"],
  },
  {
    id: "character",
    label: "Character",
    color: "#eeaac4",
    skills: CHARACTER.map((c) => c.trait),
  },
];
