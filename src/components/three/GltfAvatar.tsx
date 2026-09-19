"use client";
/**
 * Gauransh's avatar, driven from public/models/gauransh-avatar.glb.
 *
 * What the file contains (verified by parsing the GLB container):
 *   13 skinned meshes, 13 PBR materials, 23 embedded textures,
 *   1 skin with 73 Mixamo-named joints (root "Hips", plus LeftEye/RightEye),
 *   the full 51-target ARKit face set on the head, 29 on the eyelashes,
 *   and NO animation clips.
 *
 * So everything he does is authored here, in four layers:
 *   1. rest pose     arms aimed down out of the T-pose bind
 *   2. body          walk cycle while travelling; weight shifts, breathing
 *                    and glances while standing
 *   3. attention     head and eyes look at the cursor, measured from where
 *                    he actually stands on screen; when the cursor rests he
 *                    looks around on his own, with small eye saccades
 *   4. performance   on arriving at each chapter: a facial expression, eye
 *                    contact, and a nod, head tilt, wave or presenting gesture
 *
 * Rig facts the code depends on (measured in the browser, avatar facing +Z):
 *   UpLeg  +x  hip flexes forward          Leg   -x  knee bends (foot back)
 *   Foot   +x  toes lift                   Head  +x  pitch down,  +y turn to screen right
 *   LeftArm +z / RightArm -z   arm swings forward
 *   LeftForeArm +z / RightForeArm -z   elbow flexes
 *   Eye bones: local +z looks out of the face; +y looks screen right, +x looks down
 *
 * Every pose is a delta on the captured bind/rest quaternion — assigning
 * `bone.rotation` directly destroys this rig's authored bind orientation.
 * Materials, textures and meshes are used exactly as authored.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { OUTFIT, WATCH } from "@/lib/config";
import { avatar, STATIONS, type SceneId } from "@/lib/avatarStore";

type Dir = [number, number, number];
type Side = "Left" | "Right";

/* ── 1. Rest pose: world direction each arm bone should point ──────────── */
const REST_AIM: [string, string, Dir][] = [
  ["LeftArm", "LeftForeArm", [0.2, -1, -0.04]],
  ["LeftForeArm", "LeftHand", [0.12, -1, 0.1]],
  ["LeftHand", "LeftHandMiddle1", [0.08, -1, 0.12]],
  ["RightArm", "RightForeArm", [-0.2, -1, -0.04]],
  ["RightForeArm", "RightHand", [-0.12, -1, 0.1]],
  ["RightHand", "RightHandMiddle1", [-0.08, -1, 0.12]],
];
/** Relaxed curl per finger joint at rest. Flexion on this rig is local +X
 *  for both hands (measured: +x curls, -x straightens). An earlier version
 *  rotated about Z, which splays the fingers sideways instead of curling. */
const FINGER_CURL: Record<number, number> = { 1: 0.1, 2: 0.16, 3: 0.12 };

/* ── 4. Gestures ───────────────────────────────────────────────────────
 * Each arm pose is fully specified: where the arm points (or, for namaste,
 * where the wrist must land, solved with two-bone IK), which way the fingers
 * point, and which way the PALM faces. Aiming the arm alone left the palm
 * at whatever roll the aim happened to produce, which is why the earlier
 * wave read as a limp, sideways hand. `s` is +1 for the left arm, -1 right.
 */
interface ArmSpec {
  /** direction for the upper arm (ignored when `wrist` is set) */
  arm?: Dir;
  /** direction for the forearm (ignored when `wrist` is set) */
  fore?: Dir;
  /** target wrist position in model space: solved with two-bone IK */
  wrist?: Dir;
  /** which way the elbow should bend when solving IK */
  pole?: Dir;
  /** direction the fingers point */
  finger: Dir;
  /** direction the palm faces */
  palm: Dir;
}
const SPECS = {
  // A natural "hi": elbow low and forward, forearm up by the face, palm
  // toward the visitor, fingers open.
  waveA: (s: number): ArmSpec => ({ arm: [s * 0.26, -0.6, 0.46], fore: [s * 0.16, 1, 0.3], finger: [s * 0.1, 1, 0.14], palm: [0, 0.05, 1] }),
  waveB: (s: number): ArmSpec => ({ arm: [s * 0.26, -0.6, 0.46], fore: [s * -0.16, 1, 0.3], finger: [s * -0.2, 1, 0.14], palm: [0, 0.05, 1] }),
  // Presenting the content: open hand, palm up, fingers toward the page.
  present: (s: number): ArmSpec => ({ arm: [s * 0.3, -0.74, 0.5], fore: [s * 0.52, -0.06, 0.88], finger: [s * 0.62, 0.02, 0.78], palm: [0, 1, 0.2] }),
  // Namaste: palms pressed together in front of the sternum, fingers up,
  // elbows relaxed out to the sides.
  namaste: (s: number): ArmSpec => ({ wrist: [s * 0.014, 1.2, 0.21], pole: [s, -0.45, -0.3], finger: [0, 1, 0.1], palm: [-s, 0, 0] }),
} as const;
type GestureKey = keyof typeof SPECS;

/* ── 4. What he does on arriving at each chapter ───────────────────────── */
interface Performance {
  /** ARKit blendshape weights at the peak of the expression */
  face: Record<string, number>;
  gesture: "wave" | "present" | "namaste" | "none";
  /** forward bow of the upper body, radians — part of the namaste */
  bow?: number;
  /** nod depth in radians (0 = no nod) */
  nod?: number;
  /** head roll in radians */
  tilt?: number;
  /** seconds held at the peak */
  hold: number;
}
const smile = (v: number) => ({ mouthSmileLeft: v, mouthSmileRight: v });
const cheeks = (v: number) => ({ cheekSquintLeft: v, cheekSquintRight: v });
const PERF: Record<SceneId, Performance> = {
  // Landing: a namaste with a small bow and a warm smile.
  hero: { face: { ...smile(0.46), ...cheeks(0.28), eyeSquintLeft: 0.14, eyeSquintRight: 0.14 }, gesture: "namaste", bow: 0.3, hold: 2.9 },
  about: { face: { ...smile(0.42), ...cheeks(0.2), mouthDimpleLeft: 0.15, mouthDimpleRight: 0.15 }, gesture: "none", nod: 0.13, hold: 1.8 },
  engineering: { face: { browDownLeft: 0.22, browDownRight: 0.22, mouthPressLeft: 0.28, mouthPressRight: 0.28, eyeSquintLeft: 0.18, eyeSquintRight: 0.18 }, gesture: "present", hold: 2.2 },
  docrud: { face: { ...smile(0.42), browOuterUpLeft: 0.18, browOuterUpRight: 0.18 }, gesture: "present", hold: 2.2 },
  security: { face: { browDownLeft: 0.34, browDownRight: 0.34, mouthPressLeft: 0.34, mouthPressRight: 0.34, mouthFrownLeft: 0.08, mouthFrownRight: 0.08 }, gesture: "none", nod: 0.1, hold: 2.0 },
  rag: { face: { browInnerUp: 0.38, browOuterUpLeft: 0.22, browOuterUpRight: 0.22, ...smile(0.22), eyeWideLeft: 0.14, eyeWideRight: 0.14 }, gesture: "present", tilt: 0.08, hold: 2.2 },
  achievements: { face: { ...smile(0.58), ...cheeks(0.32), mouthDimpleLeft: 0.2, mouthDimpleRight: 0.2 }, gesture: "none", nod: 0.14, hold: 2.0 },
  fingerprint: { face: { browInnerUp: 0.2, mouthPucker: 0.14, mouthLeft: 0.12, eyeLookUpLeft: 0.22, eyeLookUpRight: 0.22 }, gesture: "none", tilt: -0.1, hold: 2.0 },
  ats: { face: { browOuterUpLeft: 0.28, browOuterUpRight: 0.28, ...smile(0.3) }, gesture: "present", hold: 2.4 },
  finale: { face: { ...smile(0.68), ...cheeks(0.38), jawOpen: 0.07, browInnerUp: 0.18 }, gesture: "wave", hold: 3.0 },
};

/** Resting face: a faint, relaxed smile rather than a blank stare. */
const IDLE_FACE: Record<string, number> = { mouthSmileLeft: 0.1, mouthSmileRight: 0.1 };

/**
 * Re-tint a garment's base-colour texture while keeping its detail. Each
 * pixel's brightness is taken relative to the garment's average, and that
 * ratio scales the new colour, so folds, seams and stitching survive the
 * change even when the original fabric is black.
 */
function retint(src: THREE.Texture, hex: string): THREE.Texture {
  const img = src.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!img?.width) return src;
  const cv = document.createElement("canvas");
  cv.width = img.width;
  cv.height = img.height;
  const g = cv.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, cv.width, cv.height);
  const d = px.data;
  let sum = 0, n = 0;
  for (let i = 0; i < d.length; i += 16) { sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; }
  const mean = Math.max(1, sum / Math.max(1, n));
  // Parse the hex as sRGB bytes. THREE.Color would convert it to linear
  // space, and writing linear values into an sRGB texture darkens every tint.
  const h = hex.replace("#", "");
  const [r, gg, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const f = Math.min(1.25, Math.max(0.62, 0.35 + 0.65 * (lum / mean)));
    d[i] = Math.min(255, r * f);
    d[i + 1] = Math.min(255, gg * f);
    d[i + 2] = Math.min(255, b * f);
  }
  g.putImageData(px, 0, 0);
  const out = new THREE.CanvasTexture(cv);
  out.flipY = src.flipY;
  out.colorSpace = THREE.SRGBColorSpace;
  out.wrapS = src.wrapS;
  out.wrapT = src.wrapT;
  out.channel = src.channel;
  out.anisotropy = 4;
  out.needsUpdate = true;
  return out;
}

/** Recolour one garment on a clone of its material; the cached GLB is untouched. */
function dress(root: THREE.Object3D, meshName: string, hex: string | null) {
  if (!hex) return;
  const mesh = root.getObjectByName(meshName) as THREE.Mesh | undefined;
  if (!mesh) return;
  const orig = mesh.material as THREE.MeshStandardMaterial;
  const mat = orig.clone();
  if (orig.map) mat.map = retint(orig.map, hex);
  else mat.color.set(hex);
  mat.metalness = 0;
  mat.metalnessMap = null;
  mat.roughness = 0.88;
  mat.needsUpdate = true;
  mesh.material = mat;
}

/**
 * Full-length trousers. The GLB's bottoms stop above the knee, so the leg
 * skin below the hem is painted as fabric in the body's own textures. Only
 * triangles whose three vertices all lie between the ankle and just above the
 * hem are painted, found through their UVs, so nothing spills onto arms,
 * hands or face. The roughness texture is painted too, so the fabric does not
 * keep skin's sheen.
 */
function paintLegs(root: THREE.Object3D, hex: string | null) {
  if (!hex) return;
  const body = root.getObjectByName("AvatarBody") as THREE.Mesh | undefined;
  if (!body) return;
  const orig = body.material as THREE.MeshStandardMaterial;
  const geo = body.geometry;
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  if (!pos || !uv || !orig.map?.image) return;
  const idx = geo.index;
  const tris: number[][] = [];
  const count = idx ? idx.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    const t = [0, 1, 2].map((k) => (idx ? idx.getX(i + k) : i + k));
    if (t.every((v) => { const y = pos.getY(v); return y > 0.08 && y < 0.7; })) tris.push(t);
  }
  const paint = (src: THREE.Texture, fill: string) => {
    const img = src.image as CanvasImageSource & { width: number; height: number };
    const cv = document.createElement("canvas");
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext("2d")!;
    g.drawImage(img, 0, 0);
    g.fillStyle = fill; g.strokeStyle = fill; g.lineWidth = 3; g.lineJoin = "round";
    g.beginPath();
    for (const t of tris) {
      t.forEach((v, k) => {
        const x = uv.getX(v) * cv.width;
        const y = (src.flipY ? 1 - uv.getY(v) : uv.getY(v)) * cv.height;
        if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
      });
      g.closePath();
    }
    g.fill(); g.stroke();
    const out = new THREE.CanvasTexture(cv);
    out.flipY = src.flipY; out.colorSpace = src.colorSpace; out.wrapS = src.wrapS; out.wrapT = src.wrapT;
    out.channel = src.channel; out.anisotropy = 4; out.needsUpdate = true;
    return out;
  };
  const mat = orig.clone();
  mat.map = paint(orig.map, hex);
  const mr = orig.roughnessMap ?? orig.metalnessMap;
  if (mr?.image) {
    const painted = paint(mr, "rgb(0, 232, 0)"); // G = roughness 0.91, B = metal 0
    mat.roughnessMap = painted;
    if (orig.metalnessMap) mat.metalnessMap = painted;
  }
  mat.needsUpdate = true;
  body.material = mat;
  (body.userData as { legTris?: number }).legTris = tris.length;
}

const smoothstep = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };

if (typeof window !== "undefined") (window as unknown as { __RC?: unknown }).__RC = THREE.Raycaster;

export default function GltfAvatar({ url }: { url: string }) {
  const root = useRef<THREE.Group>(null!);
  const { scene } = useGLTF(url);

  /* SkeletonUtils.clone — a plain Object3D.clone leaves every SkinnedMesh
     bound to the original skeleton, so posing the clone does nothing. */
  const model = useMemo(() => {
    const c = cloneSkinned(scene) as THREE.Group;
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false; }
    });
    dress(c, "outfit_top", OUTFIT.top);
    dress(c, "outfit_bottom", OUTFIT.bottom);
    dress(c, "outfit_shoes", OUTFIT.shoes);
    paintLegs(c, OUTFIT.legs);
    return c;
  }, [scene]);

  const rig = useMemo(() => {
    const bones: Record<string, THREE.Bone> = {};
    const hipsRest = new THREE.Vector3();
    /** authored bind rotations: fingers here are straight, used to open the hand */
    const bind: Record<string, THREE.Quaternion> = {};
    /** every blendshape by name, across head, eyelashes and teeth */
    const morph = new Map<string, { inf: number[]; i: number }[]>();
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) {
        bones[o.name] = o as THREE.Bone;
        bind[o.name] = o.quaternion.clone();
        if (o.name === "Hips") hipsRest.copy(o.position);
      }
      const m = o as THREE.Mesh;
      if (m.isMesh && m.morphTargetDictionary && m.morphTargetInfluences) {
        for (const [name, i] of Object.entries(m.morphTargetDictionary)) {
          if (!morph.has(name)) morph.set(name, []);
          morph.get(name)!.push({ inf: m.morphTargetInfluences, i });
        }
      }
    });

    /* Aim a bone so the vector to its child points along `dir` (model space). */
    const from = new THREE.Vector3(), to = new THREE.Vector3();
    const qSwing = new THREE.Quaternion(), qParent = new THREE.Quaternion(), qWorld = new THREE.Quaternion();
    const aim = (name: string, childName: string, dir: Dir) => {
      const bone = bones[name], child = bones[childName];
      if (!bone || !child) return;
      model.updateMatrixWorld(true);
      child.getWorldPosition(from).sub(bone.getWorldPosition(to)).normalize();
      to.set(dir[0], dir[1], dir[2]).normalize();
      qSwing.setFromUnitVectors(from, to);
      bone.getWorldQuaternion(qWorld);
      bone.parent!.getWorldQuaternion(qParent);
      bone.quaternion.copy(qParent.invert()).multiply(qSwing).multiply(qWorld);
    };

    /* ── arm helpers: aim, IK, forearm roll, hand orientation ───── */
    const P = (n: string) => bones[n].getWorldPosition(new THREE.Vector3());
    const v3 = (d: Dir) => new THREE.Vector3(d[0], d[1], d[2]).normalize();
    /** Rotate a bone by a WORLD-space rotation, keeping everything else. */
    const rotateWorld = (bone: THREE.Bone, r: THREE.Quaternion) => {
      const qw = bone.getWorldQuaternion(new THREE.Quaternion());
      const qp = bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
      bone.quaternion.copy(qp.multiply(r).multiply(qw));
      model.updateMatrixWorld(true);
    };
    /** Anatomical hand frame: finger direction, and the palm normal from the
     *  knuckle line (the thumb is on the index side for both hands). Measured
     *  at rest this gives palms facing the thighs, which is correct. */
    const handFrame = (side: Side) => {
      model.updateMatrixWorld(true);
      const h = P(side + "Hand");
      const f = P(side + "HandMiddle1").sub(h).normalize();
      const lat = P(side + "HandIndex1").sub(P(side + "HandPinky1"));
      lat.sub(f.clone().multiplyScalar(lat.dot(f))).normalize();
      const palm = side === "Left" ? f.clone().cross(lat) : lat.clone().cross(f);
      return { f, palm: palm.normalize() };
    };
    /** Two-bone IK: place the wrist at `wrist`, elbow bending toward `pole`. */
    const solveIK = (side: Side, wrist: Dir, pole: Dir) => {
      model.updateMatrixWorld(true);
      const S = P(side + "Arm");
      const L1 = P(side + "ForeArm").distanceTo(S);
      const L2 = P(side + "Hand").distanceTo(P(side + "ForeArm"));
      const W = new THREE.Vector3(...wrist);
      const toW = W.clone().sub(S);
      const dist = Math.min(toW.length(), L1 + L2 - 1e-4);
      const u = toW.normalize();
      const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
      const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
      const pl = v3(pole); pl.sub(u.clone().multiplyScalar(pl.dot(u))).normalize();
      const E = S.clone().add(u.clone().multiplyScalar(a)).add(pl.multiplyScalar(h));
      const Wr = S.clone().add(u.clone().multiplyScalar(dist));
      const d1 = E.clone().sub(S), d2 = Wr.clone().sub(E);
      aim(side + "Arm", side + "ForeArm", [d1.x, d1.y, d1.z]);
      aim(side + "ForeArm", side + "Hand", [d2.x, d2.y, d2.z]);
    };
    /** Turn the forearm about its own axis so the palm swings toward
     *  `palm` — pronation/supination, which is where a real wrist twists. */
    const rollForearm = (side: Side, palm: Dir) => {
      model.updateMatrixWorld(true);
      const axis = P(side + "Hand").sub(P(side + "ForeArm")).normalize();
      const cur = handFrame(side).palm; cur.sub(axis.clone().multiplyScalar(cur.dot(axis)));
      const want = v3(palm); want.sub(axis.clone().multiplyScalar(want.dot(axis)));
      if (cur.lengthSq() < 1e-6 || want.lengthSq() < 1e-6) return;
      cur.normalize(); want.normalize();
      let ang = Math.acos(THREE.MathUtils.clamp(cur.dot(want), -1, 1));
      if (axis.dot(cur.clone().cross(want)) < 0) ang = -ang;
      rotateWorld(bones[side + "ForeArm"], new THREE.Quaternion().setFromAxisAngle(axis, ang));
    };
    /** Set the hand's full orientation: fingers along `finger`, palm to `palm`. */
    const orientHand = (side: Side, finger: Dir, palm: Dir) => {
      const { f, palm: pc } = handFrame(side);
      pc.sub(f.clone().multiplyScalar(pc.dot(f))).normalize();
      const fd = v3(finger);
      const pd = v3(palm); pd.sub(fd.clone().multiplyScalar(pd.dot(fd))).normalize();
      const cur = new THREE.Matrix4().makeBasis(f, pc, f.clone().cross(pc));
      const want = new THREE.Matrix4().makeBasis(fd, pd, fd.clone().cross(pd));
      const r = new THREE.Quaternion().setFromRotationMatrix(want.multiply(cur.transpose()));
      rotateWorld(bones[side + "Hand"], r);
    };

    /** Pose the thumb chain in the hand's own frame. Each segment is aimed as
     *  a mix of (finger direction, thumb side, palm side). The authored thumb
     *  sticks straight out, 6 cm in front of the palm, so it is always set. */
    type ThumbMix = [number, number, number];
    const poseThumb = (side: Side, mix: [ThumbMix, ThumbMix, ThumbMix]) => {
      const segs = ["Thumb1", "Thumb2", "Thumb3"];
      segs.forEach((seg, i) => {
        const { f, palm } = handFrame(side);
        const lat = side === "Left" ? palm.clone().cross(f) : f.clone().cross(palm);
        const [a, b, c] = mix[i];
        const d = f.clone().multiplyScalar(a).addScaledVector(lat.normalize(), b).addScaledVector(palm, c);
        aim(`${side}Hand${seg}`, `${side}Hand${segs[i + 1] ?? "Thumb4"}`, [d.x, d.y, d.z]);
      });
      model.updateMatrixWorld(true);
    };
    /** Relaxed thumb: resting by the index finger, slightly toward the palm. */
    const THUMB_REST: [ThumbMix, ThumbMix, ThumbMix] = [[0.55, 0.62, 0.3], [0.8, 0.32, 0.32], [0.86, 0.12, 0.38]];
    /** Open hand: thumb out along the index, in the plane of the palm. */
    const THUMB_OPEN: [ThumbMix, ThumbMix, ThumbMix] = [[0.6, 0.66, 0.1], [0.9, 0.36, 0.04], [0.96, 0.18, 0.0]];
    /** Namaste: thumb laid up the hand toward the chest, pressing its pair. */
    const THUMB_NAMASTE: [ThumbMix, ThumbMix, ThumbMix] = [[0.5, 0.6, 0.27], [0.9, 0.28, 0.23], [1, 0.06, 0.14]];

    /* 1. Rest pose. Arms down, then a slight natural pronation — relaxed
       palms face the thighs and a little behind, which also turns the watch
       face partly toward the viewer — then the hands, then a light curl. */
    for (const [n, c, d] of REST_AIM) if (!n.endsWith("Hand")) aim(n, c, d);
    rollForearm("Left", [-0.9, 0, -0.42]);
    rollForearm("Right", [0.9, 0, -0.42]);
    for (const [n, c, d] of REST_AIM) if (n.endsWith("Hand")) aim(n, c, d);
    poseThumb("Left", THUMB_REST);
    poseThumb("Right", THUMB_REST);
    for (const side of ["Left", "Right"]) {
      for (const finger of ["Index", "Middle", "Ring", "Pinky"]) for (const seg of [1, 2, 3]) {
        const b = bones[`${side}Hand${finger}${seg}`];
        if (b) b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(FINGER_CURL[seg], 0, 0)));
      }
    }
    model.updateMatrixWorld(true);
    const base: Record<string, THREE.Quaternion> = {};
    for (const [n, b] of Object.entries(bones)) base[n] = b.quaternion.clone();

    /* Skin depth of the hand along the palm normal, measured with a ray cast
       from clear air on the palm side back toward the bone. Measured in the
       namaste pose itself: at rest the hand hangs against the thigh and the
       ray would hit the leg instead. */
    const body = model.getObjectByName("AvatarBody") as THREE.SkinnedMesh | undefined;
    const skinDepth = (side: Side, point: THREE.Vector3): number | null => {
      if (!body?.isSkinnedMesh) return null;
      model.updateMatrixWorld(true);
      body.skeleton.update();
      body.computeBoundingSphere();
      const { palm } = handFrame(side);
      const h = new THREE.Raycaster(point.clone().addScaledVector(palm, 0.05), palm.clone().negate()).intersectObject(body, false)[0];
      return h ? 0.05 - h.distance : null;
    };
    const contact = { heel: 0.014, finger: 0.009, tilt: 0 };

    /* Bake each gesture per arm, then restore the rest pose. */
    const PARTS = ["Arm", "ForeArm", "Hand", "HandThumb1", "HandThumb2", "HandThumb3"];
    const gesture = {} as Record<GestureKey, Record<string, THREE.Quaternion>>;
    for (const key of Object.keys(SPECS) as GestureKey[]) {
      gesture[key] = {};
      for (const side of ["Left", "Right"] as Side[]) {
        const sgn = side === "Left" ? 1 : -1;
        const spec: ArmSpec = SPECS[key](sgn);
        if (key === "namaste" && spec.wrist) {
          // Provisional pose, then measure this hand's skin at the heel of the
          // palm and at the middle finger, then re-solve so that both the heel
          // and the fingertips meet the other hand at the midline.
          const place = (wx: number, fx: number) => {
            for (const part of PARTS) bones[side + part]?.quaternion.copy(base[side + part]);
            model.updateMatrixWorld(true);
            solveIK(side, [wx, spec.wrist![1], spec.wrist![2]], spec.pole!);
            rollForearm(side, spec.palm);
            orientHand(side, [fx, spec.finger[1], spec.finger[2]], spec.palm);
            poseThumb(side, THUMB_NAMASTE);
          };
          place(sgn * 0.03, 0);
          model.updateMatrixWorld(true);
          const heelPt = P(side + "Hand").lerp(P(side + "HandMiddle1"), 0.3);
          const fingerPt = P(side + "HandMiddle2");
          const heel = skinDepth(side, heelPt), finger = skinDepth(side, fingerPt);
          if (heel != null && finger != null && heel > 0.004 && heel < 0.03) {
            contact.heel = heel;
            contact.finger = Math.max(0.004, Math.min(heel, finger));
            contact.tilt = Math.atan((contact.heel - contact.finger) / heelPt.distanceTo(fingerPt));
          }
          const tilt = Math.tan(contact.tilt);
          spec.wrist = [sgn * (contact.heel + 0.0008), spec.wrist[1], spec.wrist[2]];
          spec.finger = [-sgn * tilt, spec.finger[1], spec.finger[2]];
          place(spec.wrist[0], spec.finger[0]);
          for (const part of PARTS) gesture[key][side + part] = bones[side + part].quaternion.clone();
          for (const part of PARTS) bones[side + part]?.quaternion.copy(base[side + part]);
          continue;
        }
        for (const part of PARTS) bones[side + part]?.quaternion.copy(base[side + part]);
        model.updateMatrixWorld(true);
        if (spec.wrist) solveIK(side, spec.wrist, spec.pole ?? [side === "Left" ? 1 : -1, -0.5, -0.2]);
        else {
          if (spec.arm) aim(side + "Arm", side + "ForeArm", spec.arm);
          if (spec.fore) aim(side + "ForeArm", side + "Hand", spec.fore);
        }
        rollForearm(side, spec.palm);
        orientHand(side, spec.finger, spec.palm);
        poseThumb(side, THUMB_OPEN);
        for (const part of PARTS) gesture[key][side + part] = bones[side + part].quaternion.clone();
        for (const part of PARTS) bones[side + part]?.quaternion.copy(base[side + part]);
      }
    }
    model.updateMatrixWorld(true);

    /** Finger bones per side, and their OPEN pose for gestures. The authored
     *  bind hand is slightly curled (about 14 degrees at each knuckle), so an
     *  open hand extends the middle and tip joints about local -X, which was
     *  measured to straighten the finger to within 1-2 degrees. */
    const fingers: Record<Side, string[]> = { Left: [], Right: [] };
    const open: Record<string, THREE.Quaternion> = {};
    const EXTEND: Record<number, number> = { 1: 0, 2: 0.23, 3: 0.2 };
    for (const side of ["Left", "Right"] as Side[]) {
      for (const finger of ["Index", "Middle", "Ring", "Pinky"])
        for (const seg of [1, 2, 3]) {
          const n = `${side}Hand${finger}${seg}`;
          if (!bones[n]) continue;
          fingers[side].push(n);
          open[n] = bind[n].clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-EXTEND[seg], 0, 0)));
        }
    }

    return { bones, base, bind, open, fingers, gesture, morph, hipsRest, contact };
  }, [model]);

  /* ── The signature on the tee ─────────────────────────────────────────
     "Gauransh", printed on the wearer's left chest as in his photo. The
     position comes from raycasting the actual skinned shirt surface, so the
     print sits on the fabric rather than floating at a guessed depth; it is
     parented to the upper-spine bone so it moves with the chest. */
  const print = useMemo(() => {
    const shirt = model.getObjectByName("outfit_top") as THREE.SkinnedMesh | undefined;
    const chest = rig.bones.Spine2;
    if (!shirt || !chest || !shirt.isSkinnedMesh) return null;
    model.updateMatrixWorld(true);
    shirt.skeleton.update();
    shirt.computeBoundingSphere();
    const ray = new THREE.Raycaster();
    const hit = (x: number, y: number) => {
      ray.set(new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1));
      return ray.intersectObject(shirt, false)[0]?.point ?? null;
    };
    const X = 0.082, Y = 1.3; // wearer's left chest, below the collar
    const c = hit(X, Y), r = hit(X + 0.02, Y), u = hit(X, Y + 0.02);
    if (!c || !r || !u) return null;
    const normal = r.clone().sub(c).cross(u.clone().sub(c)).normalize();
    if (normal.z < 0) normal.negate();

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const draw = (family: string) => {
      const g = canvas.getContext("2d")!;
      g.clearRect(0, 0, 512, 128);
      g.font = `500 92px ${family}`;
      g.fillStyle = OUTFIT.top ? OUTFIT.print : "rgba(234, 232, 226, 0.94)";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("Gauransh", 256, 68);
      tex.needsUpdate = true;
    };
    draw(`"Snell Roundhand", "Segoe Script", cursive`);

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.025),
      new THREE.MeshStandardMaterial({
        map: tex, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.92, metalness: 0,
      })
    );
    mesh.name = "shirt-print";
    mesh.position.copy(c).addScaledVector(normal, 0.0025);
    mesh.lookAt(c.clone().add(normal));
    mesh.updateMatrixWorld(true);
    chest.attach(mesh);
    return { mesh, draw };
  }, [model, rig]);

  /* ── The watch ────────────────────────────────────────────────────────
     A steel Casio digital on the left wrist. The strap is fitted to the real
     wrist: rays are cast in toward the forearm axis from twelve directions to
     find the skin, and the links are laid just outside it. The case sits on
     the back of the wrist (opposite the palm) and is parented to the forearm
     bone, so it follows pronation but not the hand's own bend, like a real
     watch. The display shows the visitor's actual local time. */
  const watch = useMemo(() => {
    if (!WATCH.enabled) return null;
    const side = WATCH.wrist;
    const fore = rig.bones[side + "ForeArm"], hand = rig.bones[side + "Hand"];
    const body = model.getObjectByName("AvatarBody") as THREE.SkinnedMesh | undefined;
    if (!fore || !hand || !body?.isSkinnedMesh) return null;
    model.updateMatrixWorld(true);
    body.skeleton.update();
    body.computeBoundingSphere();
    const wp = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
    const elbow = wp(fore), wrist = wp(hand);
    const axis = wrist.clone().sub(elbow).normalize();
    const centre = wrist.clone().addScaledVector(axis, -0.038);

    // Palm direction at rest -> the back of the wrist is the opposite way.
    const mid = wp(rig.bones[side + "HandMiddle1"]);
    const f = mid.clone().sub(wrist).normalize();
    const lat = wp(rig.bones[side + "HandIndex1"]).sub(wp(rig.bones[side + "HandPinky1"]));
    lat.sub(f.clone().multiplyScalar(lat.dot(f))).normalize();
    const palm = (side === "Left" ? f.clone().cross(lat) : lat.clone().cross(f)).normalize();
    const back = palm.clone().negate(); back.sub(axis.clone().multiplyScalar(back.dot(axis))).normalize();
    const side2 = axis.clone().cross(back).normalize();

    // Fit the strap to the skin.
    const ray = new THREE.Raycaster();
    const ring: THREE.Vector3[] = [];
    let backR = 0.028;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const dir = back.clone().multiplyScalar(Math.cos(a)).addScaledVector(side2, Math.sin(a));
      ray.set(centre.clone().addScaledVector(dir, 0.12), dir.clone().negate());
      const h = ray.intersectObject(body, false)[0];
      const r = h ? 0.12 - h.distance : 0.028;
      if (i === 0) backR = r;
      ring.push(centre.clone().addScaledVector(dir, r + 0.0032));
    }

    const steel = new THREE.MeshStandardMaterial({ color: "#d9dce1", metalness: 1, roughness: 0.28 });
    const group = new THREE.Group();
    group.name = "casio";

    // Link bracelet: three rows of steel following the wrist's own outline.
    for (const off of [-0.0062, 0, 0.0062]) {
      const pts = ring.map((p) => p.clone().addScaledVector(axis, off));
      const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.0026, 6, true), steel));
    }

    // Case: 38 x 36 x 9.6 mm, on the back of the wrist.
    const caseMesh = new THREE.Mesh(new RoundedBoxGeometry(0.038, 0.036, 0.0096, 3, 0.0024), steel);
    const basis = new THREE.Matrix4().makeBasis(axis, back.clone().cross(axis).normalize(), back);
    const caseQ = new THREE.Quaternion().setFromRotationMatrix(basis);
    caseMesh.quaternion.copy(caseQ);
    caseMesh.position.copy(centre).addScaledVector(back, backR + 0.0062);
    group.add(caseMesh);

    // Face: CASIO wordmark, LCD with the live time, and the model line.
    const cv = document.createElement("canvas");
    cv.width = 320; cv.height = 288;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const draw = (now: Date) => {
      const g = cv.getContext("2d")!;
      g.fillStyle = "#1b1d22"; g.fillRect(0, 0, 320, 288);
      g.fillStyle = "#e9ecf1"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "700 38px Arial, Helvetica, sans-serif"; g.fillText("CASIO", 160, 40);
      g.font = "600 15px Arial, Helvetica, sans-serif"; g.fillStyle = "#8fb3de";
      g.fillText("ILLUMINATOR", 160, 76);
      g.fillStyle = "#a9b39a"; g.fillRect(34, 96, 252, 118);
      g.fillStyle = "#1e2419";
      const hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0");
      g.font = "700 76px 'Courier New', monospace"; g.fillText(`${hh}:${mm}`, 150, 160);
      g.font = "700 30px 'Courier New', monospace"; g.fillText(String(now.getSeconds()).padStart(2, "0"), 262, 176);
      g.font = "600 14px Arial, Helvetica, sans-serif"; g.fillStyle = "#e9ecf1";
      g.fillText("ALARM CHRONOGRAPH", 160, 238);
      g.fillStyle = "#8fb3de"; g.fillText("WATER RESIST", 160, 262);
      tex.needsUpdate = true;
    };
    draw(new Date());
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.033, 0.0297), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.1 }));
    face.quaternion.copy(caseQ);
    face.position.copy(caseMesh.position).addScaledVector(back, 0.0049);
    group.add(face);

    group.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
    model.add(group);
    model.updateMatrixWorld(true);
    fore.attach(group);
    return { group, draw, last: -1 };
  }, [model, rig]);

  /* ── Chain ────────────────────────────────────────────────────────────
     A thin silver chain: it circles the base of the neck at the back and
     drapes to the upper chest at the front. Each point is found by casting a
     ray in toward the neck at that height and sitting just outside whatever
     it hits first, skin or tee, so it lies on the body instead of floating. */
  const chain = useMemo(() => {
    if (!OUTFIT.chain) return null;
    const shirt = model.getObjectByName("outfit_top") as THREE.SkinnedMesh | undefined;
    const body = model.getObjectByName("AvatarBody") as THREE.SkinnedMesh | undefined;
    const chest = rig.bones.Spine2, neck = rig.bones.Neck;
    if (!shirt || !body || !chest || !neck) return null;
    model.updateMatrixWorld(true);
    for (const m of [shirt, body]) { m.skeleton.update(); m.computeBoundingSphere(); }
    const nk = neck.getWorldPosition(new THREE.Vector3());
    const ray = new THREE.Raycaster();
    const pts: THREE.Vector3[] = [];
    const N = 40;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;          // 0 = front (+Z)
      const front = Math.max(0, Math.cos(a));   // 1 at the front, 0 at the sides and back
      const y = nk.y - 0.035 - 0.105 * front * front;
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const axisPt = new THREE.Vector3(nk.x, y, nk.z + 0.02 * front);
      ray.set(axisPt.clone().addScaledVector(dir, 0.25), dir.clone().negate());
      const h = ray.intersectObjects([shirt, body], false)[0];
      if (!h) continue;
      pts.push(h.point.clone().addScaledVector(dir, 0.0026));
    }
    if (pts.length < N * 0.8) return null;
    const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 220, 0.0015, 6, true),
      new THREE.MeshStandardMaterial({ color: "#dfe2e7", metalness: 1, roughness: 0.2 })
    );
    mesh.name = "chain";
    mesh.castShadow = true;
    model.add(mesh);
    model.updateMatrixWorld(true);
    chest.attach(mesh);
    return mesh;
  }, [model, rig]);

  /* Redraw the print in the page's handwriting face once it has loaded. */
  useEffect(() => {
    if (!print) return;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-caveat").trim();
    if (!family) return;
    document.fonts.load(`500 92px ${family}`).then(() => print.draw(`${family}, cursive`)).catch(() => {});
  }, [print]);

  /* Dev-only handle for automated checks; stripped from production. */
  const camera = useThree((st) => st.camera);
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __avatar?: unknown }).__avatar = { model, ...rig, camera, print: print?.mesh ?? null, watch: watch?.group ?? null, chain, perf: () => perf.current };
    }
  });

  /* Scratch objects: the frame loop allocates nothing. */
  const tmp = useMemo(() => ({
    e: new THREE.Euler(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), q3: new THREE.Quaternion(),
    v: new THREE.Vector3(), face: {} as Record<string, number>,
  }), []);

  /** Apply a local delta on top of `from` (defaults to the rest pose). */
  const pose = (name: string, x: number, y: number, z: number, from?: THREE.Quaternion) => {
    const b = rig.bones[name];
    const q0 = from ?? rig.base[name];
    if (!b || !q0) return;
    tmp.e.set(x, y, z);
    b.quaternion.copy(q0).multiply(tmp.q.setFromEuler(tmp.e));
  };

  const yaw = useRef(0);
  const look = useRef({ yaw: 0, pitch: 0, eyeX: 0, eyeY: 0 });
  const blink = useRef({ t: 0, next: 2.2, n: 0, double: false });
  const saccade = useRef({ t: 0, x: 0, y: 0, n: 0 });
  const cursor = useRef({ x: 0, y: 0, still: 0 });
  const perf = useRef<{ scene: SceneId; start: number } | null>(null);
  const prev = useRef<{ walking: boolean; scene: SceneId | null }>({ walking: false, scene: null });

  useFrame((state, dt) => {
    if (watch) {
      const now = new Date();
      if (now.getSeconds() !== watch.last) { watch.last = now.getSeconds(); watch.draw(now); }
    }
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    const a = avatar;
    const B = rig.bones;

    /* ── travel between stations ─────────────────────────────── */
    const nf = state.size.width / state.size.height < 1.1 ? STATIONS[a.scene].narrow : undefined;
    const station = STATIONS[a.scene];
    // "away" chapters: he steps out past the left edge of the frame.
    const target = station.away ? -9 : nf ? nf.x : a.targetX * a.compress;
    const dx = target - a.x;
    // Walk a little faster over long distances, so leaving and returning
    // does not keep the visitor waiting.
    const speed = a.exiting ? 3.2 : Math.min(4.2, 2.4 + Math.abs(dx) * 0.2);
    if (a.reduceMotion) { a.x = target; a.setWalking(false); }
    else if (Math.abs(dx) > 0.02) {
      a.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * d);
      a.facing = dx > 0 ? 1 : -1;
      a.setWalking(true);
    } else { a.x = target; a.setWalking(false); }
    root.current.position.x = a.x;

    const targetYaw = a.walking ? a.facing * Math.PI * 0.5 : 0;
    yaw.current += (targetYaw - yaw.current) * Math.min(1, d * 5);
    root.current.rotation.y = yaw.current;
    const w = a.walking ? 1 : 0;

    /* ── arrival: start a performance ─────────────────────────── */
    const arrived = prev.current.walking && !a.walking;
    const changedInPlace = !a.walking && prev.current.scene !== a.scene;
    if ((arrived || changedInPlace) && !a.exiting && !station.away) perf.current = { scene: a.scene, start: t + (prev.current.scene === null ? 0.8 : 0.15) };
    if (a.walking) perf.current = null;
    prev.current = { walking: a.walking, scene: a.scene };

    const P = perf.current ? PERF[perf.current.scene] : null;
    const tau = perf.current ? t - perf.current.start : -1;
    const env = P && tau > 0 ? smoothstep(tau / 0.5) * (1 - smoothstep((tau - 0.5 - P.hold) / 0.7)) : 0;
    const gw = P && P.gesture !== "none" ? env : 0;
    const side = STATIONS[a.scene].side;
    const arm: Side = side === "right" ? "Left" : "Right"; // the arm nearer the content

    /* ── legs: walk, or an idle weight shift ──────────────────── */
    const gait = Math.sin(t * 7.2);
    const shift = Math.sin(t * 0.78); // >0 = weight on the left leg
    const idle = 1 - w;
    pose("LeftUpLeg", gait * 0.48 * w + Math.max(0, -shift) * 0.05 * idle, 0, 0.02);
    pose("RightUpLeg", -gait * 0.48 * w + Math.max(0, shift) * 0.05 * idle, 0, -0.02);
    pose("LeftLeg", -Math.max(0, -gait) * 0.75 * w - Math.max(0, -shift) * 0.12 * idle, 0, 0);
    pose("RightLeg", -Math.max(0, gait) * 0.75 * w - Math.max(0, shift) * 0.12 * idle, 0, 0);
    pose("LeftFoot", Math.max(0, gait) * 0.22 * w - Math.max(0, -gait) * 0.18 * w, 0, 0);
    pose("RightFoot", Math.max(0, -gait) * 0.22 * w - Math.max(0, gait) * 0.18 * w, 0, 0);

    /* ── torso ─────────────────────────────────────────────────── */
    const breathe = Math.sin(t * 1.1);
    const hips = B.Hips;
    if (hips) hips.position.set(rig.hipsRest.x + shift * 0.016 * idle, rig.hipsRest.y + Math.abs(Math.sin(t * 14.4)) * 0.012 * w, rig.hipsRest.z);
    pose("Hips", 0, -gait * 0.08 * w, -shift * 0.024 * idle + gait * 0.02 * w);
    // Namaste timing: the palms meet first, then he bows, holds, and rises
    // before the hands part. Other gestures bow (if at all) with the envelope.
    const bowEnv = P?.gesture === "namaste" && tau > 0
      ? smoothstep((tau - 0.55) / 0.75) * (1 - smoothstep((tau - 2.35) / 0.75))
      : env;
    const bow = (P?.bow ?? 0) * bowEnv;
    pose("Spine", breathe * 0.012 * idle + 0.03 * w + bow * 0.34, gait * 0.04 * w, 0);
    pose("Spine1", bow * 0.3, 0, 0);
    pose("Spine2", -breathe * 0.006 * idle + bow * 0.3, gait * 0.05 * w, shift * 0.02 * idle);

    /* ── arms: gesture blend, walk swing, breath ──────────────── */
    // Contralateral swing: the left arm goes forward as the RIGHT leg does.
    const forward = { Left: -gait * 0.36 * w, Right: gait * 0.36 * w };
    const waveK = (Math.sin(Math.max(0, tau) * 8.5) + 1) / 2;
    for (const s of ["Left", "Right"] as Side[]) {
      const sign = s === "Left" ? 1 : -1; // left bones: +z forward / flex
      // Namaste uses both arms; wave and present use the arm nearer the content.
      const both = P?.gesture === "namaste";
      const g = both || s === arm ? gw : 0;
      const key: GestureKey | null =
        P?.gesture === "present" ? "present" : P?.gesture === "wave" ? "waveA" : both ? "namaste" : null;
      for (const part of ["Arm", "ForeArm", "Hand", "HandThumb1", "HandThumb2", "HandThumb3"]) {
        const n = s + part;
        let from = rig.base[n];
        if (g > 0 && key) {
          let target = rig.gesture[key][n];
          if (P?.gesture === "wave" && part !== "Arm") target = tmp.q3.copy(rig.gesture.waveA[n]).slerp(rig.gesture.waveB[n], waveK);
          from = tmp.q2.copy(rig.base[n]).slerp(target, g);
        }
        const free = 1 - g;
        if (part === "Arm") pose(n, 0, 0, sign * (forward[s] + breathe * 0.012 * idle) * free, from);
        else if (part === "ForeArm") pose(n, 0, 0, sign * (0.1 + Math.max(0, forward[s]) * 0.6) * free, from);
        else pose(n, 0, 0, 0, from);
      }
      pose(s + "Shoulder", 0, 0, 0);
      // An open, relaxed hand during any gesture; the rest curl otherwise.
      for (const n of rig.fingers[s]) {
        const b = rig.bones[n];
        if (g > 0) b.quaternion.copy(rig.base[n]).slerp(rig.open[n], g);
        else b.quaternion.copy(rig.base[n]);
      }
    }

    /* ── attention: where he looks ────────────────────────────── */
    // Track whether the cursor is moving; after a pause he looks around.
    if (Math.abs(a.pointer.x - cursor.current.x) + Math.abs(a.pointer.y - cursor.current.y) > 0.002) cursor.current.still = 0;
    else cursor.current.still += d;
    cursor.current.x = a.pointer.x; cursor.current.y = a.pointer.y;

    // Cursor relative to his head on screen, not to the screen centre.
    let relX = 0, relY = 0;
    if (B.Head) {
      B.Head.getWorldPosition(tmp.v).project(state.camera);
      relX = a.pointer.x - tmp.v.x;
      relY = a.pointer.y + tmp.v.y; // pointer y grows downward, NDC y upward
    }
    const wander = smoothstep((cursor.current.still - 2.6) / 1.2);
    let tYaw = THREE.MathUtils.clamp(relX * 0.55, -0.6, 0.6) * (1 - wander) + (Math.sin(t * 0.29) * 0.32 + Math.sin(t * 0.71) * 0.08) * wander;
    let tPitch = THREE.MathUtils.clamp(relY * 0.32, -0.25, 0.28) * (1 - wander) + (0.03 + Math.sin(t * 0.23) * 0.07) * wander;
    // Performance: eye contact with the visitor.
    tYaw *= 1 - env * 0.75;
    tPitch *= 1 - env * 0.75;
    if (w) { tYaw = -yaw.current * 0.35; tPitch = 0.06; } // walking: eyes on the path
    const L = look.current;
    L.yaw += (tYaw - L.yaw) * Math.min(1, d * 4.5);
    L.pitch += (tPitch - L.pitch) * Math.min(1, d * 4.5);

    // A double nod over about 1.3 s, the second smaller, like a person agreeing.
    let nod = 0;
    if (P?.nod && tau > 0.4 && tau < 1.7) {
      const k = (tau - 0.4) / 1.3;
      nod = P.nod * Math.sin(Math.PI * 2 * k) * (k < 0.5 ? 1 : 0.55) * Math.sin(Math.PI * k) ** 0.5;
      nod = Math.abs(nod);
    }
    const roll = (P?.tilt ?? 0) * env + Math.sin(t * 0.8) * 0.012 * idle;
    pose("Neck", L.pitch * 0.35 + nod * 0.3 + bow * 0.35, L.yaw * 0.3, 0);
    pose("Head", L.pitch * 0.65 + nod * 0.7 + bow * 0.9, L.yaw * 0.7, roll);

    // Eyes lead the head, plus small saccades every second or so.
    const S = saccade.current;
    S.t += d;
    if (S.t > 0.9 + (S.n % 4) * 0.25) {
      S.t = 0; S.n++;
      S.x = Math.sin(S.n * 12.9898) * 0.06;
      S.y = Math.sin(S.n * 78.233) * 0.035;
    }
    const eX = THREE.MathUtils.clamp(relX * 0.3, -0.3, 0.3) * (1 - wander) * (1 - env) + S.x;
    const eY = THREE.MathUtils.clamp(relY * 0.18, -0.18, 0.18) * (1 - wander) * (1 - env) + S.y;
    L.eyeX += (eX - L.eyeX) * Math.min(1, d * 14);
    L.eyeY += (eY - L.eyeY) * Math.min(1, d * 14);
    pose("LeftEye", L.eyeY, L.eyeX, 0);
    pose("RightEye", L.eyeY, L.eyeX, 0);

    /* ── face: blink + resting expression + performance ───────── */
    const K = blink.current;
    K.t += d;
    let lid = 0;
    if (K.t > K.next) {
      const k = K.t - K.next;
      lid = k < 0.06 ? k / 0.06 : Math.max(0, 1 - (k - 0.06) / 0.09);
      if (K.double && k > 0.2 && k < 0.35) lid = Math.max(lid, 1 - Math.abs(k - 0.27) / 0.07);
      if (k > (K.double ? 0.36 : 0.16)) {
        K.t = 0; K.n++;
        K.next = 2.2 + ((K.n * 7) % 5) * 0.7;
        K.double = K.n % 6 === 0;
      }
    }
    const F = tmp.face;
    for (const k of Object.keys(F)) F[k] = 0;
    for (const [k, v] of Object.entries(IDLE_FACE)) F[k] = v * (1 - env);
    if (P) for (const [k, v] of Object.entries(P.face)) F[k] = (F[k] ?? 0) + v * env;
    // While bowing he lowers his eyes and softens the lids.
    const lowered = P?.gesture === "namaste" ? bowEnv * 0.42 : 0;
    F.eyeBlinkLeft = Math.max(lid, (F.eyeSquintLeft ?? 0) * 0.2, lowered);
    F.eyeBlinkRight = Math.max(lid, (F.eyeSquintRight ?? 0) * 0.2, lowered);
    F.eyeLookDownLeft = (F.eyeLookDownLeft ?? 0) + lowered * 0.6;
    F.eyeLookDownRight = (F.eyeLookDownRight ?? 0) + lowered * 0.6;
    for (const [name, v] of Object.entries(F)) {
      const slots = rig.morph.get(name);
      if (slots) for (const s of slots) s.inf[s.i] = Math.min(1, Math.max(0, v));
    }
  });

  return (
    <group ref={root} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload("/models/gauransh-avatar.glb");
