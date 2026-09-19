/**
 * The skill balls for the opening. Static markup, one per résumé skill, in
 * ALL_SKILLS order. SkillFormation first lays them out as a readable flowing
 * cloud, then flies each onto his body and hides the layer when done.
 */
import { ALL_SKILLS } from "@/lib/skills";

export default function IntroOrbs() {
  return (
    <div id="intro-orbs" className="intro-orbs" aria-hidden>
      {ALL_SKILLS.map((s) => (
        <div key={s.group + s.skill} className="orb" style={{ ["--c" as string]: s.color, opacity: 0 } as React.CSSProperties}>
          <i />
          <span>{s.skill}</span>
        </div>
      ))}
    </div>
  );
}
