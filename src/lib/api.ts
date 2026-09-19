export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export interface Profile {
  name: string;
  title: string;
  titleParts: string[];
  tagline: string;
  heroBio: string;
  about: string[];
  motto: string;
  builds: string[];
  avatarIntro: string;
  location: string;
  summary: string;
  contact: { email: string; phone: string };
  links: { githubPersonal: string; githubLegacy: string; linkedin: string; codechef: string; chess: string | null };
  chessUsername: string | null;
  skills: { group: string; items: string[] }[];
  experience: { role: string; company: string; period: string; projects: { name: string; tag: string; stack: string; points: string[] }[] }[];
  work: { name: string; tag: string; stack: string; url: string; org: string }[];
  sideProjects: { name: string; stack: string; blurb: string }[];
  education: { degree: string; school: string; period: string };
  achievements: string[];
}

export interface GitHubLive {
  ok: boolean; error?: string;
  login: string; name: string | null; avatarUrl: string; url: string; bio: string | null;
  publicRepos: number; followers: number; following: number; stars: number; forks: number;
  languages: { name: string; count: number }[];
  topRepos: { name: string; url: string; stars: number; language: string | null; description: string | null; pushedAt: string }[];
  lastPush: string | null; fetchedAt: string;
}

export interface CodeChefLive {
  ok: boolean; error?: string;
  username: string; url: string; rating: number; stars: string | null; highestRating: number | null;
  globalRank: number | null; countryRank: number | null; problemsSolved: number | null; contests: number | null; fetchedAt: string;
}

export interface ActivityLive {
  ok: boolean; error?: string;
  user: string; days: number; empty: boolean;
  totals: { pushes: number; pullRequests: number; activeDays: number; repos: number };
  series: { date: string; pushes: number; prs: number }[];
  windowStart?: string; windowEnd?: string;
  repos: { name: string; events: number }[];
  note?: string; fetchedAt?: string;
}

export interface WorkItem {
  name: string; tag: string; stack: string; url: string; org: string;
  live: boolean; status: number | null;
}

export interface AtsResult {
  label: string; disclaimer: string;
  overallScore: number; keywordMatch: number; skillMatch: number; experienceMatch: number;
  projectMatch: number; educationMatch: number; roleMatch: number;
  matchedSkills: string[]; missingSkills: string[]; matchedKeywords: string[]; missingKeywords: string[];
  categoryBreakdown: Record<string, { matched: number; asked: number; ratio: number }>;
  recommendations: string[]; explanation: Record<string, string>; method: string;
}

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  profile: () => fetch(`${API_BASE}/api/profile`).then((r) => json<Profile>(r)),
  github: () => fetch(`${API_BASE}/api/live/github`).then((r) => json<{ users: GitHubLive[] }>(r)),
  codechef: () => fetch(`${API_BASE}/api/live/codechef`).then((r) => json<CodeChefLive>(r)),
  activity: () => fetch(`${API_BASE}/api/live/activity`).then((r) => json<{ users: ActivityLive[] }>(r)),
  work: () => fetch(`${API_BASE}/api/live/work`).then((r) => json<{ ok: boolean; projects: WorkItem[] }>(r)),
  ats: (jobDescription: string) =>
    fetch(`${API_BASE}/api/ats`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobDescription }) }).then((r) => json<AtsResult>(r)),
  contact: (body: Record<string, unknown>) =>
    fetch(`${API_BASE}/api/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => json<{ ok: true }>(r)),
  chess: (body: Record<string, unknown>) =>
    fetch(`${API_BASE}/api/chess-challenge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => json<{ ok: true; playLink?: string }>(r)),
};

/* Session id for the disclosed analytics (same key as the legacy site). */
export function sessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const KEY = "ga_session";
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
