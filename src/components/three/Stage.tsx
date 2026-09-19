"use client";
/**
 * The fixed 3D layer. Content scrolls over it; the avatar walks between
 * stations underneath. Pointer position feeds the avatar's head/eye tracking.
 */
import { Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { avatar, STATIONS } from "@/lib/avatarStore";
import { AVATAR_MODEL } from "@/lib/config";
import GltfAvatar from "./GltfAvatar";
import SkillAtom from "./SkillAtom";
import { Ground } from "./Props";

/** Camera + fog + key light follow the current scene. */
function Environment() {
  const { scene, camera, size } = useThree();
  const fog = new THREE.Color();
  const light = new THREE.Color();
  const look = { y: 1.05 };
  const frame = { fov: 38, dist: 1 };

  useEffect(() => {
    scene.fog = new THREE.Fog("#08080d", 6, 22);
    scene.background = null;
  }, [scene]);

  useFrame((_, dt) => {
    const st = STATIONS[avatar.scene];
    const k = Math.min(1, dt * 2);
    if (scene.fog instanceof THREE.Fog) scene.fog.color.lerp(fog.set(st.fog), k);
    const key = scene.getObjectByName("key") as THREE.PointLight | undefined;
    if (key) key.color.lerp(light.set(st.light), k);

    // Narrow viewports: compress station spacing and pull the camera back so
    // the whole avatar fits on a phone screen instead of filling it.
    const aspect = size.width / size.height;
    avatar.compress = aspect < 1 ? 0.35 : aspect < 1.4 ? 0.75 : 1;

    /* Per-chapter framing. The hero uses a narrow fov and a short distance to
       crop the avatar at the waist without wide-angle distortion; every other
       chapter keeps the wide full-figure view. */
    const cam = camera as THREE.PerspectiveCamera;
    frame.fov += ((st.fov ?? 38) - frame.fov) * Math.min(1, dt * 2.5);
    frame.dist += ((st.dist ?? 1) - frame.dist) * Math.min(1, dt * 2.5);
    if (Math.abs(cam.fov - frame.fov) > 0.01) {
      cam.fov = frame.fov;
      cam.updateProjectionMatrix();
    }
    const baseZ = aspect < 0.7 ? 11.5 : aspect < 1 ? 9.5 : 7.2;
    // Portrait screens stack the layout, so a chapter can supply its own
    // framing (the hero puts a portrait at the top, details underneath).
    const narrowFrame = aspect < 1.1 ? st.narrow : undefined;
    const targetZ = narrowFrame ? narrowFrame.z : baseZ * frame.dist;
    camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 2.5);

    /* Half the visible world height at the subject plane — the unit the
       phone's vertical offset is expressed in, so it survives a fov change. */
    const halfH = camera.position.z * Math.tan((frame.fov / 2) * (Math.PI / 180));

    // Camera gently follows the avatar and leans with the pointer (parallax).
    // Parallax scales with the framing, so a tight hero does not swing wildly.
    const parallax = 0.25 * frame.dist;
    const camTargetX = avatar.x * 0.25 + avatar.pointer.x * parallax;
    const camTargetY = 1.35 + avatar.pointer.y * -0.12 * frame.dist;
    camera.position.x += (camTargetX - camera.position.x) * Math.min(1, dt * 2.5);
    camera.position.y += (camTargetY - camera.position.y) * Math.min(1, dt * 2.5);
    // On a phone the layout stacks: copy on top, avatar in the lower band.
    // Aiming the camera higher pushes the avatar down the screen to match.
    const lookTarget = narrowFrame ? narrowFrame.look : (st.look ?? 1.05) + (aspect < 1 ? halfH * 0.56 : 0);
    look.y += (lookTarget - look.y) * Math.min(1, dt * 2);
    camera.lookAt(avatar.x * 0.25, look.y, 0);
  });
  return null;
}

export default function Stage() {
  useEffect(() => {
    avatar.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onMove = (e: PointerEvent) => {
      avatar.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      avatar.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => { avatar.pointer.x = 0; avatar.pointer.y = 0; };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => { window.removeEventListener("pointermove", onMove); document.removeEventListener("pointerleave", onLeave); };
  }, []);

  return (
    <div className="stage" aria-hidden>
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 1.35, 7.2], fov: 38, near: 0.1, far: 60 }}
      >
        <Environment />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#dfe6f2", "#08080d", 0.55]} />
        <pointLight name="key" position={[2.5, 4, 3]} intensity={34} color="#9db8d8" castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 5, 2]} intensity={1.1} color="#ffffff" />
        <spotLight position={[0, 6, -2]} intensity={8} angle={0.5} penumbra={1} color="#62768f" />
        <Ground />
        <Suspense fallback={null}>
          <GltfAvatar url={AVATAR_MODEL} />
          <SkillAtom />
        </Suspense>
      </Canvas>
    </div>
  );
}
