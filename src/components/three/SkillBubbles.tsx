"use client";
/**
 * Skill bubbles on the landing page.
 *
 * (The opening — every skill forming his skeleton — is SkeletonIntro.)
 *
 * After the namaste a few key bubbles return and settle beside him, integrated
 * rather than orbiting: AI and cloud by the head, character at the chest,
 * backend and data by the arms. Each bobs gently in place and is tied into
 * the body by a thin line. The role toggle lights the bubbles for that role.
 *
 * Responsive: bubble size follows the viewport; portrait screens use a
 * roomier eight-bubble layout; and the spread is clamped every frame to the
 * free space beside the avatar, so bubbles never leave the screen or reach
 * into the details panel.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { avatar } from "@/lib/avatarStore";
import { HERO_BUBBLES, ORBITS, ROLES } from "@/lib/skills";

type Anchor = "head" | "chest" | "arm";
/** [x, y, where the line enters the body, index into HERO_BUBBLES] */
type Slot = [number, number, Anchor, number];

/** Landscape layout: six rows of two, beside the head, chest and arms. */
const WIDE: Slot[] = [
  [-0.3, 1.82, "head", 0], [0.3, 1.8, "head", 1],
  [-0.37, 1.68, "head", 2], [0.37, 1.66, "head", 3],
  [-0.34, 1.54, "chest", 4], [0.34, 1.52, "chest", 5],
  [-0.38, 1.4, "arm", 6], [0.38, 1.38, "arm", 7],
  [-0.34, 1.26, "arm", 8], [0.34, 1.24, "arm", 9],
  [-0.3, 1.12, "arm", 10], [0.3, 1.1, "arm", 11],
];
/** Portrait layout: four rows of two, spaced for small screens. */
const TALL: Slot[] = [
  [-0.44, 1.84, "head", 0], [0.44, 1.84, "head", 1],
  [-0.48, 1.62, "chest", 4], [0.48, 1.62, "chest", 5],
  [-0.46, 1.4, "arm", 6], [0.46, 1.4, "arm", 7],
  [-0.42, 1.18, "arm", 8], [0.42, 1.18, "arm", 10],
];
const CHEST = new THREE.Vector3(0, 1.38, 0.1);
/** Seconds after arriving (the quick namaste takes about 0.9 s) before the bubbles return. */
const RETURN_AFTER = 1.0;
const colorOf = (g: string) => ORBITS.find((o) => o.id === g)?.color ?? "#b3aaf2";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));


export default function SkillBubbles() {
  const root = useRef<THREE.Group>(null!);
  const nodes = useRef<(THREE.Group | null)[]>([]);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const S = useRef({
    vis: 0, on: 0,
    bones: null as null | Record<string, THREE.Object3D>,
    panelLeft: 0, panelAt: 0,
    /** measured correction to the spread (feedback from real screen rects) */
    fix: 1, fixAt: 0,
  });

  const lines = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(HERO_BUBBLES.length * 6), 3));
    const col = new Float32Array(HERO_BUBBLES.length * 6);
    HERO_BUBBLES.forEach((b, i) => {
      const c = new THREE.Color(colorOf(b.group));
      col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    });
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 }));
  }, []);


  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), inv: new THREE.Matrix4() }), []);

  useFrame((st, dt) => {
    const d = Math.min(dt, 0.05);
    const a = avatar;
    const s = S.current;
    const t = st.clock.elapsedTime;
    const W = st.size.width, H = st.size.height;
    const tall = W / H < 1.1;
    const slots = tall ? TALL : WIDE;
    const used = new Set(slots.map((sl) => sl[3]));

    if (!s.bones) {
      const need = ["Head", "Spine2", "LeftArm", "LeftForeArm", "RightArm", "RightForeArm"];
      const found = Object.fromEntries(need.map((n) => [n, st.scene.getObjectByName(n)]));
      if (need.every((n) => found[n])) s.bones = found as Record<string, THREE.Object3D>;
    }
    root.current.position.set(a.x, 0, 0);

    /* ── afterwards: bubbles settle beside him ───────────────────── */
    const here = a.introDone && a.scene === "hero" && !a.walking && !a.exiting;
    s.on = here ? s.on + d : 0;
    s.vis += ((here && s.on > RETURN_AFTER ? 1 : 0) - s.vis) * Math.min(1, d * (here ? 2 : 4));
    root.current.visible = s.vis > 0.004;
    if (!root.current.visible) return;

    // Free room beside him, in world units at his depth: to the screen edge
    // on the left, and to the details panel (or the edge) on the right.
    if (t - s.panelAt > 0.5) {
      const panel = document.querySelector(".hero__panel")?.getBoundingClientRect();
      s.panelLeft = panel && !tall ? panel.left : W;
      s.panelAt = t;
    }
    root.current.updateMatrixWorld();
    v.c.set(0, CHEST.y, 0).applyMatrix4(root.current.matrixWorld).project(st.camera);
    const cx = ((v.c.x + 1) / 2) * W;
    const pxPerWorld = H / (2 * Math.tan(((st.camera as THREE.PerspectiveCamera).fov * Math.PI) / 360) * st.camera.position.distanceTo(v.a.set(a.x, CHEST.y, 0)));
    const bubblePx = els.current.find((el) => el && el.offsetWidth)?.offsetWidth ?? 78;
    const margin = 10 + bubblePx / 2;
    const room = Math.min(cx - margin, s.panelLeft - margin - cx);
    const reach = Math.max(...slots.map((sl) => Math.abs(sl[0])));
    // Correct against where the bubbles really landed: perspective and the
    // off-centre camera make the estimate slightly generous at the edges.
    if (t - s.fixAt > 0.3 && s.vis > 0.9) {
      s.fixAt = t;
      let minL = Infinity, maxR = -Infinity;
      els.current.forEach((el) => {
        if (!el || +el.style.opacity < 0.3) return;
        const r = el.getBoundingClientRect();
        minL = Math.min(minL, r.left); maxR = Math.max(maxR, r.right);
      });
      if (minL < 8 || maxR > s.panelLeft - 8) s.fix = Math.max(0.6, s.fix * 0.96);
      else if (minL > 40 && maxR < s.panelLeft - 40) s.fix = Math.min(1, s.fix * 1.01);
    }
    const xScale = THREE.MathUtils.clamp((room / pxPerWorld / reach) * s.fix, 0.45, 1.15);

    const lit = new Set(ROLES.find((r) => r.id === a.role)?.skills ?? []);
    const pos = lines.geometry.attributes.position as THREE.BufferAttribute;
    v.inv.copy(root.current.matrixWorld).invert();

    HERO_BUBBLES.forEach((b, i) => {
      const g = nodes.current[i], el = els.current[i];
      if (!g || !el) return;
      const slot = slots.find((sl) => sl[3] === i);
      if (!slot) { el.style.opacity = "0"; pos.setXYZ(i * 2, 0, 0, 0); pos.setXYZ(i * 2 + 1, 0, 0, 0); return; }
      const [x, y, anchor] = slot;
      const bob = a.reduceMotion ? 0 : Math.sin(t * 0.9 + i * 1.3) * 0.012;
      const sway = a.reduceMotion ? 0 : Math.cos(t * 0.7 + i * 0.8) * 0.006;
      g.position.set(x * xScale + sway, y + bob, 0.08);

      const order = slots.indexOf(slot);
      const k = clamp01((s.on - RETURN_AFTER - order * 0.07) / 0.35) * s.vis;
      const pop = k <= 0 ? 0 : 1 + 0.22 * Math.sin(Math.PI * k) * (1 - k);
      const on = lit.has(b.skill);
      el.style.opacity = String(k * (on ? 1 : 0.46));
      el.style.transform = `scale(${pop * (on ? 1.06 : 0.94)})`;
      el.dataset.lit = on ? "1" : "0";

      if (s.bones) {
        const sx = x > 0 ? 1 : -1;
        const side = x > 0 ? "Left" : "Right";
        if (anchor === "head") s.bones.Head.getWorldPosition(v.b).add(v.a.set(sx * 0.085, 0.01, -0.005));
        else if (anchor === "chest") s.bones.Spine2.getWorldPosition(v.b).add(v.a.set(sx * 0.1, 0.03, 0.1));
        else s.bones[side + "Arm"].getWorldPosition(v.b).lerp(s.bones[side + "ForeArm"].getWorldPosition(v.a), 0.55);
        v.b.applyMatrix4(v.inv);
        pos.setXYZ(i * 2, g.position.x, g.position.y, g.position.z);
        pos.setXYZ(i * 2 + 1, v.b.x, v.b.y, v.b.z);
      }
    });
    pos.needsUpdate = true;
    (lines.material as THREE.LineBasicMaterial).opacity = 0.3 * s.vis;
  });

  return (
    <group ref={root} visible={false}>
      <primitive object={lines} />
      {HERO_BUBBLES.map((b, i) => (
        <group key={b.skill} ref={(g) => { nodes.current[i] = g; }}>
          <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <div
              ref={(el) => { els.current[i] = el; }}
              className="bubble-skill"
              style={{ ["--c" as string]: colorOf(b.group), opacity: 0 } as React.CSSProperties}
            >
              <span>{b.skill}</span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
