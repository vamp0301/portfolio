# DESIGN.md — Gauransh Agarwal, Interactive Engineering Portfolio

The one-line brief: **a guided tour through the systems Gauransh builds**, not a page about him.
A 3D avatar travels the page; each chapter is a system he has shipped, told with the numbers from his résumé.

## Principles
1. **Résumé is the source of truth.** Every number, project and claim on the page exists in `backend/config/profile.js`. Nothing is invented for effect.
2. **Scroll → travel → arrive → explain → explore.** The avatar only walks between chapters. While the visitor reads, it idles and watches the cursor. No roaming.
3. **Dark glass, one accent.** Black ground, blurred glass panels, and a single cool-steel accent across the whole site. Colour is an instrument reading, not decoration: the most saturated thing on the page is the accent at 27% saturation.
4. **One decoration budget, spent carefully.** The hand-drawn annotations, particle field, wireframe props, floating speech bubble, rotating rings and vertical progress rail were all removed. What remains is the ground plane, the glass panels and the type. If something does not carry information, it is not on the page.
5. **Motion is information.** Wires draw in the direction data flows; pulses travel along them; numbers count to their real values; panels get one scan sweep on reveal. Nothing loops for decoration except the particle field and the halo.

## Tokens (`web/src/app/globals.css`)
| Token | Value | Use |
|---|---|---|
| `--bg` / `--bg-2` | `#050508` / `#0a0a12` | page ground, gradient base |
| `--ink`, `--ink-2`, `--ink-3` | white at 100 / 72 / 48 % | text hierarchy |
| `--glass`, `--glass-2` | white at 4.5 / 8 % | panel fills |
| `--line`, `--line-2` | white at 10 / 18 % | borders, wires |
| `--accent`, `--accent-2` | `#9db8d8` / `#62768f` | kicker, wires, buttons, rim light |
| `--ok`, `--warn` | `#a8c6a0` / `#c9b489` | live pill, gate pass, status |
| `--hand` | `#cdc6ba` | annotation ink |
| `--radius` / `--radius-sm` | 22 / 12 px | panels / inputs |

There are no per-scene accents. Chapters are distinguished by composition, diagram and which side the avatar stands on, not by hue.

## Type
- **Syne 700/800** — display and headings. Tight (-0.03em), short lines.
- **Manrope 400–600** — body. 16 px, 1.55 line height, 56 ch max.
- **JetBrains Mono** — kickers, chips, labels, diagram text. Always uppercase + tracked for labels.
- **Caveat** — annotations and the avatar's speech bubble only.

## Layout
- Every chapter is a `<Scene>`: full viewport, a two-column grid. Content takes one column; the avatar's station is the other (`STATIONS[id].side`).
- Hero and finale are centred; the avatar stands at x = 0.
- Below 900 px the annotation layer hides, stations compress toward centre, and the avatar sits low with content stacked above.

## Components
`glass` (+ `glass--pad`, `glass--sm`), `chip` (+ `--on`, `--off`), `btn` (+ `--ghost`, `--solid`), `kicker`, `h-display`, `h-scene`, `lede`, `bignum`, `chain`, `diagram`, `anno`, `bubble`, `field`/`form`.

## Motion rules
- Reveal: y 28 → 0, blur 6 → 0, 0.9 s, stagger 0.08, `power3.out`, reverses on scroll-back.
- Wires: `stroke-dashoffset` draw, 0.9 s, `power2.inOut`. Pulses ride `getPointAtLength`.
- Numbers: 1.6 s `power2.out` count-up to the résumé value.
- Avatar: 2.5 world-units/s walk, 7.2 Hz gait, faces travel direction, turns to the viewer on arrival. Head yaw ±0.55 rad and pitch ±0.22 rad toward the cursor, with the body yaw subtracted so the head holds the cursor while walking; eye bones add ±0.3 rad of gaze; blink drives the `eyeBlinkLeft` / `eyeBlinkRight` morphs.
- `prefers-reduced-motion`: no walking (teleport), no decode, no pulses, no reveal offsets.

## 3D stage
Fixed canvas between the background and content. Camera at (0, 1.35, 7.2), fov 38, follows the avatar at 25 % and leans with the cursor. Fog and key light lerp to each scene's colours. Props are wireframe holograms that scale in at the station.

## The avatar
`web/public/models/gauransh-avatar.glb` is the single source of truth. It is a Ready Player Me style rig: 13 skinned meshes, 13 PBR materials, 23 embedded textures, 73 joints, ARKit blendshapes, and no animation clips. Materials and textures are used exactly as authored.

Because the file ships no clips, idle, walk, gaze and blink are authored on the rig in `components/three/GltfAvatar.tsx`. Two things about the rig shape that code:

- **Clone with `SkeletonUtils.clone`, never `Object3D.clone`.** A plain clone leaves every `SkinnedMesh` bound to the original skeleton, so posing the cloned bones does nothing and the figure stays in its T-pose.
- **Pose by delta, and aim rather than rotate.** Each bone's local +Y runs down the bone and the authored bind orientation lives in the node rotations, so assigning `bone.rotation.set(...)` destroys the bind pose and folds every limb straight up. The rest pose is built by aiming each arm bone at a target world direction, and the per-frame animation composes `bindQuaternion * delta` on top.

The narration is a caption under each chapter rule, in the same place every time. It was a bubble floating over the model's face, which read as a game and covered the likeness.

## Copy
Every fact on the page exists in `backend/config/profile.js`. The whole tour is about 750 words. A chapter earns a sentence of lede and nothing more; numbers carry the argument.

## Charts
Charts encode with opacity, weight and position, never with a second hue. The activity strip is one bar per day over 30 days; a pull-request day gets a light cap rather than a different colour. A genuinely empty account is a real state that renders, and it is drawn as a dashed box that says so, not as a broken chart.

### Gestures, hands and the shirt print
- **Every gesture sets the palm, not just the arm.** An arm pose is specified as arm direction (or a wrist target solved with two-bone IK), finger direction, and palm direction. The forearm is rolled about its own axis first, where a real wrist twists, and then the hand's full orientation is set.
- **Finger flexion on this rig is local +X for both hands.** +X curls, -X straightens. The rest pose curls the fingers slightly; during a gesture they extend to within about 2 degrees of straight. An earlier version rotated about Z, which splays the fingers sideways.
- **Namaste on the landing page.** The palms press together first, then he bows about 16° from the waist with his eyes lowered, holds, and rises. The hand's skin depth is measured from the mesh in the namaste pose itself (at rest the ray would hit the thigh), and the fingertips tilt inward just enough that the heels, fingers and thumbs all meet. Measured skin gaps: 1 mm at the heel, 3 mm at the fingers, 0.3 mm at the thumbs. The wave is kept for the goodbye on the contact page.
- **Thumbs are always posed.** The authored thumb sticks straight out, 6 cm in front of the palm. At rest it relaxes by the index finger; in open-hand gestures it lies in the palm plane; in the namaste it lays up the hand to press its pair.
- **"Gauransh" on the tee.** The position is found by raycasting the skinned shirt mesh, and the print is parented to `Spine2` so it moves with the chest. It is drawn in the site's Caveat face.
- **The Live chapter uses the full width.** The avatar steps out of frame for that chapter and walks back in for the next one, so data never sits behind him.

### Colour
Four soft hues sit over near-black at 7 to 15 percent opacity: indigo, teal, rose and amber. A drifting wash moves to a different pair of hues in each chapter. Headings use a steel-to-lilac-to-peach sheen. The page should read as tinted, not coloured.

### Outfit
All black, Gen-Z: black tee with his signature in white, black full-length trousers, white sneakers, a thin silver chain, and a steel Casio digital on the left wrist showing the visitor's real time. It is set in `src/lib/config.ts` (`OUTFIT`, `WATCH`).
- Garments are re-tinted from their own textures, so folds and seams survive. The tint hex is written as sRGB bytes; `THREE.Color` would convert to linear and darken everything.
- The GLB's bottoms are shorts, so the leg skin below the hem is painted as fabric in the body's colour and roughness textures, through the leg triangles' own UVs.
- The watch strap and the chain are fitted by raycasting the skin and the shirt, then parented to the forearm and upper spine so they move with him.

### Skill atom
Skills live in `src/lib/skills.ts`, taken from the résumé, in three orbits: backend and data, AI and cloud, and character. Each character trait carries its résumé evidence. On the landing page the atom forms around the avatar after the namaste. Its rings are real 3D, so he occludes them; the labels dim on the far side and never cross his face or the details panel. Chapter 07 shows the full atom, with every skill and the evidence behind each trait.

### Motion
Every chapter has the same motion. A progress line runs across the top. The kicker rule draws in as a chapter arrives, and the kicker, heading and caption drift in depth as you scroll. Cards tilt toward the cursor. Signals travel down each pipeline, and the security gate checks a request step by step. Activity bars grow when seen and the rating marker slides into place. Headings carry a slow sheen and buttons a hover sheen. None of this runs for visitors who prefer reduced motion.
