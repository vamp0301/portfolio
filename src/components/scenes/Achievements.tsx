"use client";
/**
 * The live chapter. Everything here is fetched at request time by the API and
 * is labelled with what it actually measures.
 *
 * On the deliberate absence of a commit count: GitHub's public events feed
 * strips the commit payload for pushes to private repositories, so a commit
 * total is not obtainable without granting a token scope over private work.
 * Rather than approximate one, this shows pushes and opened pull requests,
 * which the feed does report, and says so on the card.
 */
import { useEffect, useState } from "react";
import Scene from "@/components/ui/Scene";
import { api, type ActivityLive, type CodeChefLive, type GitHubLive, type Profile, type WorkItem } from "@/lib/api";

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString());
const day = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
};

/** 30-day activity strip. One bar per day, single hue, opacity carries weight. */
function ActivityChart({ a }: { a: ActivityLive }) {
  const series = a.series ?? [];
  const max = Math.max(1, ...series.map((d) => d.pushes + d.prs));
  const W = 560, H = 84, gap = 2.2;
  const bw = (W - gap * (series.length - 1)) / Math.max(1, series.length);
  const label = `${a.totals.pushes} pushes and ${a.totals.pullRequests} pull requests over ${a.totals.activeDays} active days in the last ${a.days} days`;

  if (!series.length || a.empty) {
    return (
      <div className="chart chart--empty" role="img" aria-label="No public activity in the last 30 days">
        <span>No public activity in this window</span>
      </div>
    );
  }
  return (
    <figure className="chart" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="chart__svg">
        <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} className="chart__base" />
        {series.map((d, i) => {
          const total = d.pushes + d.prs;
          const h = total === 0 ? 1.5 : Math.max(2.5, (total / max) * (H - 6));
          const x = i * (bw + gap);
          return (
            <g key={d.date} style={{ ["--i" as string]: i } as React.CSSProperties}>
              <rect x={x} y={H - h} width={bw} height={h} rx={Math.min(1.2, bw / 2)} className={total ? "chart__bar" : "chart__bar chart__bar--zero"}>
                <title>{`${day(d.date)}: ${d.pushes} pushes, ${d.prs} pull requests`}</title>
              </rect>
              {d.prs > 0 && <rect x={x} y={H - h} width={bw} height={Math.min(h, 2)} className="chart__pr" />}
            </g>
          );
        })}
      </svg>
      <figcaption className="chart__cap">
        <span>{series.length ? day(series[0].date) : ""}</span>
        <span>pushes per day</span>
        <span>{series.length ? day(series[series.length - 1].date) : ""}</span>
      </figcaption>
    </figure>
  );
}

/** One GitHub account as a landscape layer: identity and figures on the left, the chart on the right. */
function AccountLayer({ g, a, handle, i }: { g?: GitHubLive; a?: ActivityLive; handle: string; i: number }) {
  const live = g?.ok || a?.ok;
  return (
    <article className={`layer layer--${i}`} style={{ "--i": i } as React.CSSProperties} data-reveal>
      <header className="layer__id">
        {g?.ok ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.avatarUrl} alt="" />
        ) : (
          <div className="live__ph" aria-hidden />
        )}
        <div>
          <b>@{handle}</b>
          <span>GitHub</span>
        </div>
        <span className={`pill-live ${live ? "" : "off"}`}><i />{live ? "live" : "offline"}</span>
      </header>

      <dl className="layer__stats">
        <div><dt>pushes · 30d</dt><dd>{a?.ok ? fmt(a.totals.pushes) : "—"}</dd></div>
        <div><dt>PRs opened</dt><dd>{a?.ok ? fmt(a.totals.pullRequests) : "—"}</dd></div>
        <div><dt>active days</dt><dd>{a?.ok ? fmt(a.totals.activeDays) : "—"}</dd></div>
        <div><dt>public repos</dt><dd>{g?.ok ? fmt(g.publicRepos) : "—"}</dd></div>
      </dl>

      <div className="layer__chart">
        {a?.ok ? <ActivityChart a={a} /> : <div className="chart chart--empty"><span>Activity unavailable</span></div>}
        <div className="layer__foot">
          {g?.ok && g.languages.length > 0 && <span>{g.languages.slice(0, 3).map((l) => l.name).join(" · ")}</span>}
          <a className="live__link" href={`https://github.com/${handle}`} target="_blank" rel="noopener">View profile</a>
        </div>
      </div>
    </article>
  );
}

/** CodeChef's published rating bands, used to place the live rating on a track. */
const CC_BANDS: [number, string][] = [[1400, "2★"], [1600, "3★"], [1800, "4★"], [2000, "5★"], [2200, "6★"], [2500, "7★"]];
const CC_MIN = 1000, CC_MAX = 2600;
const ccStars = (r: number) => { let st = "1★"; for (const [min, lab] of CC_BANDS) if (r >= min) st = lab; return st; };
const ccPos = (r: number) => `${Math.min(100, Math.max(0, ((r - CC_MIN) / (CC_MAX - CC_MIN)) * 100))}%`;

function CodeChefLayer({ c, i }: { c: CodeChefLive | null; i: number }) {
  const ok = !!c?.ok;
  return (
    <article className={`layer layer--${i}`} style={{ "--i": i } as React.CSSProperties} data-reveal>
      <header className="layer__id">
        <div className="live__ph live__ph--cc" aria-hidden>CC</div>
        <div><b>@gauransh375</b><span>CodeChef</span></div>
        <span className={`pill-live ${ok ? "" : "off"}`}><i />{ok ? "live" : "offline"}</span>
      </header>

      <dl className="layer__stats">
        <div><dt>rating</dt><dd>{ok ? fmt(c!.rating) : "—"}</dd></div>
        <div><dt>solved</dt><dd>{ok ? fmt(c!.problemsSolved) : "—"}</dd></div>
        <div><dt>contests</dt><dd>{ok ? fmt(c!.contests) : "—"}</dd></div>
        <div><dt>India rank</dt><dd>{ok && c!.countryRank ? `#${fmt(c!.countryRank)}` : "—"}</dd></div>
      </dl>

      <div className="layer__chart">
        {ok ? (
          <figure className="band" role="img" aria-label={`Rating ${c!.rating}, peak ${c!.highestRating ?? c!.rating}, in the ${ccStars(c!.rating)} band`}>
            <div className="band__track">
              {CC_BANDS.map(([min, lab]) => (
                <span key={min} className="band__tick" style={{ left: ccPos(min) }}><i>{lab}</i></span>
              ))}
              {c!.highestRating != null && c!.highestRating !== c!.rating && (
                <span className="band__peak" style={{ left: ccPos(c!.highestRating) }} title={`peak ${c!.highestRating}`} />
              )}
              <span className="band__now" style={{ left: ccPos(c!.rating) }}><b>{c!.rating}</b></span>
            </div>
            <figcaption className="chart__cap">
              <span>{CC_MIN}</span>
              <span>{ccStars(c!.rating)} · CodeChef rating band</span>
              <span>{CC_MAX}</span>
            </figcaption>
          </figure>
        ) : (
          <div className="chart chart--empty"><span>Rating unavailable</span></div>
        )}
        <div className="layer__foot">
          <span>{ok && c!.globalRank ? `global #${fmt(c!.globalRank)}` : ""}</span>
          <a className="live__link" href="https://www.codechef.com/users/gauransh375" target="_blank" rel="noopener">View profile</a>
        </div>
      </div>
    </article>
  );
}

export default function Achievements({ p }: { p: Profile | null }) {
  const [gh, setGh] = useState<GitHubLive[]>([]);
  const [act, setAct] = useState<ActivityLive[]>([]);
  const [cc, setCc] = useState<CodeChefLive | null>(null);
  const [work, setWork] = useState<WorkItem[]>([]);

  useEffect(() => {
    api.github().then((r) => setGh(r.users)).catch(() => {});
    api.activity().then((r) => setAct(r.users)).catch(() => {});
    api.codechef().then(setCc).catch(() => setCc(null));
    api.work().then((r) => setWork(r.projects)).catch(() => {});
  }, []);

  const byLogin = (h: string) => gh.find((g) => g.login?.toLowerCase() === h);
  const actFor = (h: string) => act.find((a) => a.user?.toLowerCase() === h);
  const items = work.length ? work : (p?.work ?? []).map((w) => ({ ...w, live: false, status: null }));

  return (
    <Scene id="achievements">
      <header className="live-head">
        <div>
          <div className="kicker" data-reveal>06 — Live</div>
          <h2 className="h-scene" data-reveal>Fetched, not <span className="grad">typed in</span>.</h2>
        </div>
        <p className="small live-head__note" data-reveal>
          Read from the GitHub and CodeChef APIs when this page loads, and cached for a few minutes.
        </p>
      </header>

      <div className="layers">
        <AccountLayer g={byLogin("gauransh-code")} a={actFor("gauransh-code")} handle="gauransh-code" i={0} />
        <AccountLayer g={byLogin("vamp0301")} a={actFor("vamp0301")} handle="vamp0301" i={1} />
        <CodeChefLayer c={cc} i={2} />
      </div>

      <p className="small footnote" data-reveal>
        Activity is read from the public events feed, which reaches back about 90 days. GitHub does not
        expose commit counts for pushes to private repositories, so pushes and pull requests are shown
        instead of a commit total.
      </p>

      <div className="work" data-reveal>
        <div className="mono label">Shipped</div>
        <ul className="work__list">
          {items.map((w) => (
            <li key={w.name} className="work__row">
              <span className="work__name">{w.name}</span>
              <span className="work__tag">{w.tag}</span>
              <span className="work__stack">{w.stack}</span>

              {w.url ? (
                <a className="work__link" href={w.url} target="_blank" rel="noopener">
                  {w.url.replace(/^https?:\/\//, "")}
                  {w.live && <i className="work__dot" aria-label="responding" />}
                </a>
              ) : (
                <span className="work__link work__link--none">internal · no public URL</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Scene>
  );
}
