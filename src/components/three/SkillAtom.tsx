"use client";
/**
 * The landing page's atom: Gauransh is the nucleus, and his skills orbit him
 * on three rings (backend & data, AI & cloud, character).
 *
 * - The rings and electrons are real 3D, so the avatar occludes them when they
 *   pass behind him. Labels are DOM and cannot be occluded, so they dim and
 *   shrink on the far side of each orbit instead.
 * - Each ring is tilted so its near side passes in front of the chest and
 *   hands, never across the face, and its width keeps every label inside the
 *   avatar's half of the screen, clear of the details panel.
 * - It forms only after the namaste has finished, and dissolves when the
 *   visitor leaves the landing page.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { avatar } from "@/lib/avatarStore";
import { ORBITS } from "@/lib/skills";

interface RingSpec {
  y: number;
  r: number;
  /** tilt about X: lowers the near side so it passes below the face */
  tilt: number;
  /** roll about Z: gives the classic crossed-ellipse atom silhouette */
  roll: number;
  /** radians per second; sign sets direction */
  speed: number;
  /** how many of the orbit's skills ride this ring */
  count: number;
}

const RINGS: RingSpec[] = [
  { y: 1.34, r: 0.38, tilt: 0.3, roll: 0.38, speed: 0.3, count: 6 },
  { y: 1.28, r: 0.41, tilt: 0.22, roll: -0.42, speed: -0.24, count: 6 },
  { y: 1.2, r: 0.35, tilt: 0.36, roll: 0.06, speed: 0.19, count: 5 },
];

/** Seconds after arriving on the landing page before the atom forms. */
const FORM_AFTER = 4.3;

export default function SkillAtom() {
  const root = useRef<THREE.Group>(null!);
  const rings = useRef<(THREE.Group | null)[]>([]);
  const electrons = useRef<(THREE.Group | null)[][]>(RINGS.map(() => []));
  const labels = useRef<(HTMLSpanElement | null)[][]>(RINGS.map(() => []));
  const lines = useRef<(THREE.LineLoop | null)[]>([]);
  const state = useRef({ vis: 0, on: 0, angle: RINGS.map((_, i) => i * 1.7) });

  const geometry = useMemo(
    () =>
      RINGS.map((ring) => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i < 96; i++) {
          const a = (i / 96) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r));
        }
        return new THREE.BufferGeometry().setFromPoints(pts);
      }),
    []
  );

  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((st, dt) => {
    const d = Math.min(dt, 0.05);
    const a = avatar;
    const S = state.current;
    const here = a.scene === "hero" && !a.walking && !a.exiting;
    S.on = here ? S.on + d : 0;
    const target = here && S.on > FORM_AFTER ? 1 : 0;
    S.vis += (target - S.vis) * Math.min(1, d * (target ? 1.6 : 3.5));
    root.current.visible = S.vis > 0.004;
    if (!root.current.visible) return;
    root.current.position.set(a.x, 0, 0);
    root.current.rotation.y = 0;

    // Labels are hidden on narrow screens, where the atom is too small to read.
    const narrow = st.size.width < 720;

    RINGS.forEach((ring, i) => {
      if (!a.reduceMotion) S.angle[i] += ring.speed * d;
      const line = lines.current[i];
      if (line) (line.material as THREE.LineBasicMaterial).opacity = 0.34 * S.vis;
      const n = ring.count;
      for (let j = 0; j < n; j++) {
        const e = electrons.current[i][j];
        if (!e) continue;
        const th = S.angle[i] + (j / n) * Math.PI * 2;
        e.position.set(Math.cos(th) * ring.r, 0, Math.sin(th) * ring.r);
        // A gentle "forming" effect: electrons fly in from further out.
        const k = 1 + (1 - S.vis) * 0.6;
        e.position.multiplyScalar(k);
        e.getWorldPosition(tmp);
        const depth = (tmp.z + ring.r) / (2 * ring.r); // 0 = far side, 1 = near side
        const front = THREE.MathUtils.clamp(depth, 0, 1);
        const el = labels.current[i][j];
        if (el) {
          el.style.opacity = narrow ? "0" : String(S.vis * (0.22 + 0.78 * front * front));
          el.style.transform = `scale(${0.82 + 0.26 * front})`;
          el.style.zIndex = String(Math.round(front * 10));
        }
        const dot = e.children[0] as THREE.Mesh | undefined;
        if (dot) (dot.material as THREE.MeshBasicMaterial).opacity = S.vis * (0.45 + 0.55 * front);
      }
    });
  });

  return (
    <group ref={root} visible={false}>
      {RINGS.map((ring, i) => {
        const orbit = ORBITS[i];
        return (
          <group
            key={orbit.id}
            ref={(g) => { rings.current[i] = g; }}
            position={[0, ring.y, 0.02]}
            rotation={[ring.tilt, 0, ring.roll]}
          >
            <lineLoop ref={(l) => { lines.current[i] = l; }} geometry={geometry[i]}>
              <lineBasicMaterial color={orbit.color} transparent opacity={0} depthWrite={false} />
            </lineLoop>
            {orbit.skills.slice(0, ring.count).map((skill, j) => (
              <group key={skill} ref={(g) => { electrons.current[i][j] = g; }}>
                <mesh>
                  <sphereGeometry args={[0.0095, 12, 10]} />
                  <meshBasicMaterial color={orbit.color} transparent opacity={0} depthWrite={false} />
                </mesh>
                <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                  <span
                    ref={(el) => { labels.current[i][j] = el; }}
                    className="atom-label"
                    style={{ ["--c" as string]: orbit.color, opacity: 0 } as React.CSSProperties}
                  >
                    {skill}
                  </span>
                </Html>
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
}
