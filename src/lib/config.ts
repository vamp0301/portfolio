/**
 * Gauransh's avatar. This GLB is the single source of truth for how he is
 * represented anywhere in the portfolio. It is a Ready Player Me style rig:
 * 13 skinned meshes, 73 joints, ARKit blendshapes, and no animation clips —
 * the motion is authored on the rig in components/three/GltfAvatar.tsx.
 */
export const AVATAR_MODEL = "/models/gauransh-avatar.glb";

/** Portrait for the About chapter. Put the file at web/public/avatar/photo.jpg */
export const PHOTO_URL = "/avatar/photo.jpg";

/**
 * Outfit: an all-black Gen-Z fit. Each garment keeps its own fabric texture
 * (folds, seams, stitching) and is re-tinted. The GLB's bottoms are shorts,
 * so `legs` paints the leg skin below them as the same fabric, which reads as
 * full-length slim trousers. Set any entry to null to use the GLB's own look.
 */
export const OUTFIT: {
  top: string | null; bottom: string | null; legs: string | null; shoes: string | null;
  print: string; chain: boolean;
} = {
  top: "#17171b",     // black tee
  bottom: "#141418",  // black trousers...
  legs: "#141418",    // ...carried down to the ankle
  shoes: "#ecebe6",   // white sneakers
  print: "rgba(236, 234, 228, 0.92)", // white signature, as on his real tee
  chain: true,        // thin silver chain
};

/** The watch on his left wrist: a steel Casio digital, showing the real local time. */
export const WATCH = { enabled: true, wrist: "Left" as "Left" | "Right" };
