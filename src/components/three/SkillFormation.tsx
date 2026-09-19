"use client";
/**
 * The opening, once per visit, about 3.4 s before the quick namaste:
 *
 *   0.00  every résumé skill appears as a small labelled ball, laid out as a
 *         readable cloud beside him (real DOM flow, so no label overlaps)
 *   1.35  head first, each ball flies onto its region of his body — AI and
 *         languages to the head, character to the torso, backend and data to
 *         the arms, frontend and cloud to the legs
 *         ...and as each lands it bursts into particles that spread over that
 *         region of his real 3D surface, so his human form assembles out of
 *         the skills (a volume, not a stick figure)
 *   2.95  his model is revealed from the feet up over the particle form
 *   3.40  done; the namaste follows, ending near 4.2 s
 *
 * The particles are sampled from his actual skinned meshes (head, shirt,
 * skin, trousers, shoes) in the rest pose, coloured by the skill group that
 * built that region. The clock advances with the frames, capped per frame,
 * so a browser stall pauses the opening instead of skipping a phase.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { avatar } from "@/lib/avatarStore";
import { ALL_SKILLS } from "@/lib/skills";

type Region = "head" | "torso" | "arms" | "legs";
const REGION_OF: Record<string, Region> = {
  ai: "head", languages: "head", character: "torso", backend: "arms", data: "arms", frontend: "legs", cloud: "legs",
};
/** particles per mesh — roughly by visible surface */
const QUOTA: [string, number][] = [["AvatarHead", 520], ["outfit_top", 820], ["AvatarBody", 760], ["outfit_bottom", 380], ["outfit_shoes", 220]];

const READ_END = 1.35, FLY = 0.5, FLY_GAP = 0.012, SPRAY = 0.5;
const REVEAL_AT = 2.95, REVEAL_DUR = 0.4, DONE_AT = 3.4;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => { const c = clamp01(x); return c * c * (3 - 2 * c); };
const outCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const inOut = (x: number) => { const c = clamp01(x); return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2; };

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.4, "rgba(255,255,255,0.7)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export default function SkillFormation() {
  const S = useRef({
    warm: 3, t: 0, built: false, flying: false,
    layer: null as HTMLElement | null,
    /** his root node: every point below is stored relative to it, so the
     *  form follows him wherever he stands (sampled world positions would
     *  go stale if he moves after the first frame) */
    body: null as THREE.Object3D | null,
    anchors: [] as THREE.Vector3[],
    flyStart: [] as number[],
    from: [] as { x: number; y: number }[],
    target: new Float32Array(0),
    owner: new Int32Array(0),
    jitter: new Float32Array(0),
  });

  // Visible where y >= the reveal line: the particles vanish into him as his
  // model is revealed upward.
  const above = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.15), []);
  const points = useMemo(() => {
    const m = new THREE.PointsMaterial({
      size: 2.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95,
      depthWrite: false, blending: THREE.AdditiveBlending, map: dotTexture(), clippingPlanes: [above],
    });
    const p = new THREE.Points(new THREE.BufferGeometry(), m);
    p.frustumCulled = false;
    p.renderOrder = 5;
    return p;
  }, [above]);
  const v = useMemo(() => new THREE.Vector3(), []);
  const w = useMemo(() => new THREE.Vector3(), []);

  useFrame((st, dt) => {
    const a = avatar;
    const s = S.current;
    s.layer ??= document.getElementById("intro-orbs");
    if (a.introDone) {
      if (s.layer && s.layer.className !== "intro-orbs") s.layer.className = "intro-orbs";
      points.visible = false;
      return;
    }
    if (a.reduceMotion) { a.reveal = 1; a.introDone = true; return; }
    const find = (n: string) => st.scene.getObjectByName(n);
    if (!find("Hips") || !s.layer) return;
    const W = st.size.width, H = st.size.height;
    const tall = W / H < 1.1;

    /* ── build once: sample his surface, pick anchors, lay out the tags ── */
    if (!s.built) {
      s.built = true;
      const bodyRoot = find("AvatarRoot") ?? find("Hips")!.parent!;
      s.body = bodyRoot;
      bodyRoot.updateMatrixWorld(true);
      const toLocal = bodyRoot.matrixWorld.clone().invert();
      const P = (n: string) => find(n)!.getWorldPosition(new THREE.Vector3()).applyMatrix4(toLocal);
      const hips = P("Hips"), neck = P("Neck"), cx = hips.x;
      const rand = rng(7);
      const pts: THREE.Vector3[] = [], region: Region[] = [];
      for (const [name, n] of QUOTA) {
        const mesh = find(name) as THREE.SkinnedMesh | undefined;
        if (!mesh) continue;
        mesh.updateMatrixWorld(true);
        mesh.skeleton?.update();
        const count = mesh.geometry.attributes.position.count;
        for (let i = 0; i < n; i++) {
          const p = new THREE.Vector3();
          mesh.getVertexPosition(Math.floor(rand() * count), p);
          p.applyMatrix4(mesh.matrixWorld).applyMatrix4(toLocal);
          pts.push(p);
          const dx = Math.abs(p.x - cx);
          region.push(p.y > neck.y ? "head" : dx > 0.21 ? "arms" : p.y < hips.y ? "legs" : "torso");
        }
      }
      // Anchors: for each region, spread its balls over its points by
      // farthest-point sampling, so every skill lands somewhere distinct.
      const anchorOf: number[] = new Array(ALL_SKILLS.length);
      const regionBalls: Record<Region, number[]> = { head: [], torso: [], arms: [], legs: [] };
      ALL_SKILLS.forEach((sk, j) => regionBalls[REGION_OF[sk.group] ?? "torso"].push(j));
      s.anchors = new Array(ALL_SKILLS.length);
      for (const r of Object.keys(regionBalls) as Region[]) {
        const idx = pts.map((_, i) => i).filter((i) => region[i] === r);
        const balls = regionBalls[r];
        if (!idx.length) continue;
        const chosen: number[] = [idx.reduce((best, i) => (pts[i].y > pts[best].y ? i : best), idx[0])];
        while (chosen.length < balls.length) {
          let far = idx[0], farD = -1;
          for (const i of idx) {
            let d = Infinity;
            for (const c of chosen) d = Math.min(d, pts[i].distanceToSquared(pts[c]));
            if (d > farD) { farD = d; far = i; }
          }
          chosen.push(far);
        }
        balls.forEach((j, k) => { s.anchors[j] = pts[chosen[k]].clone(); anchorOf[j] = chosen[k]; });
      }
      // Each particle belongs to the nearest ball of its own region.
      const n = pts.length;
      s.target = new Float32Array(n * 3);
      s.owner = new Int32Array(n);
      s.jitter = new Float32Array(n);
      const colors = new Float32Array(n * 3);
      const col = new THREE.Color();
      pts.forEach((p, i) => {
        const balls = regionBalls[region[i]];
        let best = balls[0] ?? 0, bd = Infinity;
        for (const j of balls) { const d = p.distanceToSquared(s.anchors[j]); if (d < bd) { bd = d; best = j; } }
        s.owner[i] = best;
        s.target.set([p.x, p.y, p.z], i * 3);
        s.jitter[i] = rand() * Math.PI * 2;
        col.set(ALL_SKILLS[best].color).multiplyScalar(0.72 + rand() * 0.4);
        colors.set([col.r, col.g, col.b], i * 3);
      });
      points.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3).fill(-100), 3));
      points.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      // Head first: balls fly in order of height.
      const order = ALL_SKILLS.map((_, j) => j).sort((x, y) => s.anchors[y].y - s.anchors[x].y);
      s.flyStart = new Array(ALL_SKILLS.length);
      order.forEach((j, rank) => { s.flyStart[j] = READ_END + rank * FLY_GAP; });

      // Readable layout: the tags flow in the free space beside him.
      const panel = document.querySelector(".hero__panel")?.getBoundingClientRect();
      const box = tall
        ? { l: 0.04 * W, t: 0.09 * H, r: 0.96 * W, b: 0.43 * H }
        : { l: 0.03 * W, t: 0.13 * H, r: (panel ? panel.left : W * 0.55) - 0.03 * W, b: 0.93 * H };
      Object.assign(s.layer.style, { left: `${box.l}px`, top: `${box.t}px`, width: `${box.r - box.l}px`, height: `${box.b - box.t}px` });
      s.layer.className = "intro-orbs is-flow";

      // Compile and upload now, so nothing stalls mid-opening.
      st.gl.compile(st.scene, st.camera);
      st.scene.traverse((o) => {
        const mats = (o as THREE.Mesh).material;
        if (!mats) return;
        for (const m of Array.isArray(mats) ? mats : [mats])
          for (const val of Object.values(m)) if (val && (val as THREE.Texture).isTexture) st.gl.initTexture(val as THREE.Texture);
      });
      return;
    }
    if (s.warm > 0) { s.warm--; return; }
    s.t += Math.min(0.1, dt);
    const t = s.t;
    const bodyM = s.body!.matrixWorld;
    points.matrixAutoUpdate = false;
    points.matrix.copy(bodyM);
    const kids = s.layer.children;

    /* ── read: tags pop in, one after another ─────────────────────── */
    if (!s.flying) {
      for (let j = 0; j < kids.length; j++) (kids[j] as HTMLElement).style.opacity = String(clamp01((t - j * 0.012) / 0.18));
      if (t < READ_END) return;
      // Switch to free flight from exactly where each dot sits in the flow.
      s.from = [...kids].map((el) => {
        const r = (el as HTMLElement).firstElementChild!.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      s.layer.removeAttribute("style");
      s.layer.className = "intro-orbs is-fly";
      s.flying = true;
    }

    /* ── fly, burst into particles, then reveal ──────────────────── */
    a.reveal = smooth((t - REVEAL_AT) / REVEAL_DUR);
    const clipY = -0.15 + a.reveal * 2.2;
    above.constant = -clipY;

    const arrive: number[] = [];
    for (let j = 0; j < ALL_SKILLS.length; j++) {
      const k = inOut((t - s.flyStart[j]) / FLY);
      arrive[j] = s.flyStart[j] + FLY;
      w.copy(s.anchors[j]).applyMatrix4(bodyM);
      v.copy(w).project(st.camera);
      const tx = ((v.x + 1) / 2) * W, ty = ((1 - v.y) / 2) * H;
      const x = s.from[j].x + (tx - s.from[j].x) * k, y = s.from[j].y + (ty - s.from[j].y) * k;
      const el = kids[j] as HTMLElement;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${1 - 0.25 * k})`;
      el.style.setProperty("--l", String(1 - smooth((k - 0.45) / 0.4)));
      el.style.opacity = String(clamp01((w.y - clipY) / 0.1));
    }

    const pos = points.geometry.attributes.position as THREE.BufferAttribute;
    const n = s.owner.length;
    for (let i = 0; i < n; i++) {
      const j = s.owner[i];
      const since = t - (arrive[j] - 0.05);
      if (since < 0) { pos.setXYZ(i, 0, -100, 0); continue; }
      const k = outCubic(since / SPRAY);
      const A = s.anchors[j];
      const sh = Math.sin(t * 3 + s.jitter[i]) * 0.0018;
      pos.setXYZ(
        i,
        A.x + (s.target[i * 3] - A.x) * k + sh,
        A.y + (s.target[i * 3 + 1] - A.y) * k,
        A.z + (s.target[i * 3 + 2] - A.z) * k
      );
    }
    pos.needsUpdate = true;
    (points.material as THREE.PointsMaterial).size = tall ? 2.1 : 2.6;

    if (t >= DONE_AT) {
      a.reveal = 1;
      a.introDone = true;
    }
  });

  return <primitive object={points} />;
}
