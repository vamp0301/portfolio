"use client";
import { useEffect, useRef, useState } from "react";
import Scene from "@/components/ui/Scene";
import { api, sessionId, type Profile } from "@/lib/api";
import { avatar } from "@/lib/avatarStore";

function useForm(submit: (data: Record<string, string>) => Promise<string>) {
  const [status, setStatus] = useState<{ kind: "" | "ok" | "err"; text: string }>({ kind: "", text: "" });
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    setBusy(true); setStatus({ kind: "", text: "Sending…" });
    try { setStatus({ kind: "ok", text: await submit(data) }); form.reset(); }
    catch (err) { setStatus({ kind: "err", text: (err as Error).message }); }
    finally { setBusy(false); }
  };
  return { status, busy, onSubmit };
}

export default function Finale({ p }: { p: Profile | null }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Signature ending: once the visitor has sat on the finale for a moment,
  // the avatar walks off the screen. Scrolling back cancels it.
  useEffect(() => {
    const onScroll = () => {
      const atEnd = window.scrollY + window.innerHeight >= document.body.scrollHeight - 4;
      if (atEnd && !timer.current) {
        timer.current = setTimeout(() => avatar.exit(), 2600);
      } else if (!atEnd && timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (timer.current) clearTimeout(timer.current); };
  }, []);

  const contact = useForm(async (d) => {
    await api.contact({ name: d.name, email: d.email, subject: d.subject, body: d.body, sessionId: sessionId() });
    return "Message sent — I’ll get back to you.";
  });
  const chess = useForm(async (d) => {
    const r = await api.chess({ challengerName: d.challengerName, chessUsername: d.chessUsername, timeControl: d.timeControl, note: d.note, sessionId: sessionId() });
    if (r.playLink) { setTimeout(() => window.open(r.playLink, "_blank", "noopener"), 600); return "Challenge sent — opening Chess.com so you can start the game."; }
    return "Challenge sent — I’ll see you on the board.";
  });

  const L = p?.links;
  return (
    <>
      <Scene id="finale" className="finale">
        <div className="kicker" data-reveal>09 — System complete</div>
        <h2 className="h-display" data-reveal>Want to build <span className="grad">something?</span></h2>
        <p className="lede" data-reveal style={{ margin: "18px auto 0" }}>Roles, freelance, or just to say hi. I read everything.</p>
        <div className="social" data-reveal>
          <a className="btn btn--ghost" href={L?.githubPersonal ?? "https://github.com/gauransh-code"} target="_blank" rel="noopener">GitHub · gauransh-code</a>
          <a className="btn btn--ghost" href={L?.githubLegacy ?? "https://github.com/vamp0301"} target="_blank" rel="noopener">GitHub · vamp0301</a>
          <a className="btn btn--ghost" href={L?.linkedin ?? "https://linkedin.com/in/gauransh0301"} target="_blank" rel="noopener">LinkedIn</a>
          <a className="btn btn--ghost" href={L?.codechef ?? "https://www.codechef.com/users/gauransh375"} target="_blank" rel="noopener">CodeChef</a>
          <a className="btn" href={`mailto:${p?.contact.email ?? "gauranshagarwal12345@gmail.com"}`}>Hire / contact</a>
        </div>

        <div className="finale__stage" aria-hidden />

        <div className="finale__forms">
          <form className="glass glass--pad form" data-reveal data-scan onSubmit={contact.onSubmit}>
            <div className="mono small" style={{ letterSpacing: ".18em", textTransform: "uppercase" }}>Talk to me</div>
            <div className="form__row">
              <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" name="name" required maxLength={120} /></div>
              <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" required maxLength={200} /></div>
            </div>
            <div className="field"><label htmlFor="c-subject">Subject</label><input id="c-subject" name="subject" maxLength={160} placeholder="Role, project, hello…" /></div>
            <div className="field"><label htmlFor="c-body">Message</label><textarea id="c-body" name="body" rows={5} required maxLength={4000} /></div>
            <div className="btn-row"><button className="btn" type="submit" disabled={contact.busy}>Send message</button><span className={`status ${contact.status.kind}`}>{contact.status.text}</span></div>
          </form>

          <form className="glass glass--pad form" data-reveal data-scan onSubmit={chess.onSubmit}>
            <div className="mono small" style={{ letterSpacing: ".18em", textTransform: "uppercase" }}>♟ Challenge me at chess</div>
            <div className="field"><label htmlFor="x-name">Your name</label><input id="x-name" name="challengerName" required maxLength={120} /></div>
            <div className="field"><label htmlFor="x-user">Your Chess.com username</label><input id="x-user" name="chessUsername" required maxLength={60} /></div>
            <div className="field"><label htmlFor="x-tc">Time control</label>
              <select id="x-tc" name="timeControl" defaultValue="rapid"><option value="bullet">Bullet</option><option value="blitz">Blitz</option><option value="rapid">Rapid</option><option value="daily">Daily</option></select>
            </div>
            <div className="field"><label htmlFor="x-note">Note (optional)</label><input id="x-note" name="note" maxLength={1000} /></div>
            <div className="btn-row"><button className="btn" type="submit" disabled={chess.busy}>Send challenge</button><span className={`status ${chess.status.kind}`}>{chess.status.text}</span></div>
            <p className="small" style={{ margin: 0 }}>{p?.chessUsername ? `My profile: chess.com/member/${p.chessUsername}` : "I’ll see it in my inbox and start the game."}</p>
          </form>
        </div>
      </Scene>
      <footer className="foot">
        © {new Date().getFullYear()} Gauransh Agarwal · {p?.contact.email ?? "gauranshagarwal12345@gmail.com"} · Basic, disclosed analytics are recorded (coarse city, device, and which chapters you read) to understand who visits. Nothing here identifies you personally.
      </footer>
    </>
  );
}
