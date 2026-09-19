/**
 * A tiny mutable store shared by the scroll layer (GSAP), the 3D stage
 * (react-three-fiber's useFrame) and the HTML speech bubble. Deliberately not
 * React state: useFrame reads it 60×/s without re-rendering anything.
 */
export type SceneId =
  | "hero" | "about" | "engineering" | "docrud" | "security"
  | "rag" | "achievements" | "fingerprint" | "ats" | "finale";

export interface Station {
  /** world-space x the avatar walks to (camera looks at origin) */
  x: number;
  /** what the avatar says on arrival */
  line: string;
  /** which side the HTML content sits on (avatar takes the other) */
  /** where the content sits; "full" spans the whole width */
  side: "left" | "right" | "center" | "full";
  /** the avatar steps out of frame for this chapter, giving the content the
   *  full width, and walks back in for the next one */
  away?: boolean;
  /** scene environment colours for the 3D stage */
  fog: string;
  light: string;
  /** world-space y the camera aims at — raise it to push the avatar down the
   *  screen so tall type (the hero name) never covers its head */
  look?: number;
  /** vertical field of view for this chapter. A narrow fov plus a matching
   *  pull-back gives a telephoto crop with no wide-angle face distortion,
   *  which is how the hero frames the avatar from the waist up. */
  fov?: number;
  /** camera distance as a multiple of the chapter default */
  dist?: number;
  /** framing override for narrow (portrait) screens, where the layout
   *  stacks: absolute camera distance, aim height, and avatar x */
  narrow?: { z: number; look: number; x: number };
}

export const STATIONS: Record<SceneId, Station> = {
  hero:         { x: -0.52, side: "right",  look: 1.4, fov: 20, dist: 0.42, narrow: { z: 7.3, look: 0.73, x: 0 }, line: "I build backend systems, full-stack products and AI workflows. This is a walk through what I have shipped.", fog: "#08080d", light: "#9db8d8" },
  about:        { x: 2.6,  side: "left",   line: "Backend-focused engineer, currently finishing a B.Tech in Computer Science at AKGEC.", fog: "#08080d", light: "#9db8d8" },
  engineering:  { x: -2.7, side: "right",  line: "The stack I work in, and the four production platforms I shipped at Corescent Technologies.", fog: "#08080d", light: "#9db8d8" },
  docrud:       { x: 2.7,  side: "left",   line: "DoCrud ingests jobs from ten ATS providers, normalises and deduplicates them, then scores each match.", fog: "#08080d", light: "#9db8d8" },
  security:     { x: -2.7, side: "right",  line: "A branch-scoped authorization review of Renzo Salon ERP, and the flaws it closed.", fog: "#08080d", light: "#9db8d8" },
  rag:          { x: 2.7,  side: "left",   line: "The WhatsCRM retrieval pipeline: documents become embeddings in Qdrant, then grounded answers.", fog: "#08080d", light: "#9db8d8" },
  achievements: { x: -2.7, side: "full", away: true,  line: "GitHub and CodeChef figures, read from their APIs when this page loads. Nothing here is hardcoded.", fog: "#08080d", light: "#9db8d8" },
  fingerprint:  { x: 2.7,  side: "left",   line: "Every skill I work with, in one atom: backend and data, AI and cloud, and the character behind them.", fog: "#08080d", light: "#9db8d8" },
  ats:          { x: -2.7, side: "right",  line: "A deterministic resume matcher. Paste a job description and every sub-score is explained.", fog: "#08080d", light: "#9db8d8" },
  finale:       { x: 0,    side: "center", look: 1.45, line: "Open to backend and full-stack roles. The form reaches my inbox directly.", fog: "#08080d", light: "#9db8d8" },
};

export const SCENE_ORDER: SceneId[] = [
  "hero", "about", "engineering", "docrud", "security",
  "rag", "achievements", "fingerprint", "ats", "finale",
];

type Listener = () => void;

class AvatarStore {
  scene: SceneId = "hero";
  /* Start AT the first station. go() ignores a request for the chapter it is
     already on, so initialising these to 0 left the hero avatar stranded in
     the centre instead of its place on the left. */
  targetX = STATIONS.hero.x;
  x = STATIONS.hero.x;
  /** true while travelling between stations */
  walking = false;
  /** +1 = facing +x, -1 = facing -x */
  facing = 1;
  /** finale: walk out of frame */
  exiting = false;
  /** reduced-motion: teleport instead of walking */
  reduceMotion = false;
  /** normalized pointer (-1..1), updated by the stage */
  pointer = { x: 0, y: 0 };
  /** 0..1 how "mobile" the layout is (stage compresses stations) */
  compress = 1;
  private listeners = new Set<Listener>();
  private snapshot = { scene: this.scene, walking: this.walking, exiting: this.exiting };

  go(scene: SceneId) {
    if (this.scene === scene && !this.exiting) return;
    this.scene = scene;
    this.exiting = false;
    this.targetX = STATIONS[scene].x;
    if (typeof document !== "undefined") document.documentElement.dataset.scene = scene;
    this.emit();
  }
  exit() {
    this.exiting = true;
    this.targetX = 9;
    this.emit();
  }
  setWalking(w: boolean) {
    if (this.walking === w) return;
    this.walking = w;
    this.emit();
  }
  subscribe = (l: Listener) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getSnapshot = () => this.snapshot;
  private emit() {
    this.snapshot = { scene: this.scene, walking: this.walking, exiting: this.exiting };
    this.listeners.forEach((l) => l());
  }
}

export const avatar = new AvatarStore();
