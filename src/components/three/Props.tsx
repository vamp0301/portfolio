"use client";
/** The only set dressing left: a soft ground the avatar stands on. */
import { useMemo } from "react";
import * as THREE from "three";

export function Ground() {
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(60, 60, "#1d2029", "#13151b");
    const m = g.material as THREE.Material;
    m.transparent = true;
    m.opacity = 0.18;
    return g;
  }, []);
  return (
    <>
      <primitive object={grid} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial transparent opacity={0.42} />
      </mesh>
    </>
  );
}
