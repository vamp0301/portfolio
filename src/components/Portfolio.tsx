"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { api, type Profile } from "@/lib/api";
import useSceneTracker from "@/lib/useSceneTracker";
import Nav from "@/components/ui/Nav";
import Analytics from "@/components/ui/Analytics";
import Motion from "@/components/ui/Motion";
import IntroOrbs from "@/components/ui/IntroOrbs";
import Hero from "@/components/scenes/Hero";
import About from "@/components/scenes/About";
import Engineering from "@/components/scenes/Engineering";
import DoCrud from "@/components/scenes/DoCrud";
import Security from "@/components/scenes/Security";
import Rag from "@/components/scenes/Rag";
import Achievements from "@/components/scenes/Achievements";
import Fingerprint from "@/components/scenes/Fingerprint";
import AtsEngine from "@/components/scenes/AtsEngine";
import Finale from "@/components/scenes/Finale";

const Stage = dynamic(() => import("@/components/three/Stage"), { ssr: false });

export default function Portfolio() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiDown, setApiDown] = useState(false);
  useSceneTracker();

  useEffect(() => {
    api.profile().then(setProfile).catch(() => setApiDown(true));
  }, []);

  return (
    <>
      <div className="bg" aria-hidden />
      <div className="wash" aria-hidden />
      <div className="spot" aria-hidden />
      <Stage />
      <IntroOrbs />
      <div className="stage-fade" aria-hidden />
      <div className="noise" aria-hidden />
      <Nav />
      <main className="content">
        {apiDown && (
          <div className="glass glass--sm mono small" style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 6, padding: "8px 14px" }}>
            API offline — showing résumé content; live data and forms need the backend on :4000.
          </div>
        )}
        <Hero p={profile} />
        <About p={profile} />
        <Engineering />
        <DoCrud />
        <Security />
        <Rag />
        <Achievements p={profile} />
        <Fingerprint />
        <AtsEngine />
        <Finale p={profile} />
      </main>
      <Analytics />
      <Motion />
    </>
  );
}
