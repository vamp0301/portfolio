"use client";
/**
 * Landing page. The avatar stands in the left half, framed from the waist up
 * by a telephoto camera (see the hero station in lib/avatarStore.ts). This
 * panel carries the details in the right half.
 */
import Scene from "@/components/ui/Scene";
import Decode from "@/components/ui/Decode";
import RoleToggle from "@/components/ui/RoleToggle";
import type { Profile } from "@/lib/api";

export default function Hero({ p }: { p: Profile | null }) {
  const email = p?.contact.email ?? "gauranshagarwal12345@gmail.com";
  return (
    <Scene id="hero" className="hero" caption={false}>
      <div className="hero__panel">
        <div className="kicker" data-reveal>Portfolio · {p?.location ?? "Ghaziabad, India"}</div>

        <h1 className="hero__name" data-reveal>
          <Decode text="Gauransh" delay={200} />
          <Decode text="Agarwal" className="grad" delay={450} />
        </h1>

        <div className="hero__rule" data-reveal aria-hidden />

        <RoleToggle />


        <div className="btn-row" data-reveal>
          <a className="btn" href="#about">Start the tour</a>
          <a className="btn btn--ghost" href="#finale">Get in touch</a>
        </div>

        <dl className="hero__meta" data-reveal>
          <div>
            <dt>Recent</dt>
            <dd>Software Engineer Intern, Corescent Technologies</dd>
          </div>
          <div>
            <dt>Education</dt>
            <dd>{p?.education?.degree ?? "B.Tech, CSE (Data Science)"}, {p?.education?.period ?? "2023 – 2027"}</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd><a href={`mailto:${email}`}>{email}</a></dd>
          </div>
        </dl>
      </div>
    </Scene>
  );
}
