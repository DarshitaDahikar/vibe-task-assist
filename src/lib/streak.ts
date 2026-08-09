import { todayISO } from "@/lib/tasks";

const STREAK_KEY = "taskpilot:streak";

type StreakData = {
  count: number;
  lastDate: string | null; // ISO date (YYYY-MM-DD) of the most recent day a task was completed
};

function readStreak(): StreakData {
  if (typeof window === "undefined") return { count: 0, lastDate: null };
  try {
    const raw = window.localStorage.getItem(STREAK_KEY);
    if (!raw) return { count: 0, lastDate: null };
    const parsed = JSON.parse(raw);
    if (typeof parsed?.count === "number") return parsed;
    return { count: 0, lastDate: null };
  } catch {
    return { count: 0, lastDate: null };
  }
}

function writeStreak(data: StreakData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

function isoYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Current streak (consecutive days with at least one completed task), without mutating it. */
export function getStreak(): number {
  const { count, lastDate } = readStreak();
  if (!lastDate) return 0;
  const today = todayISO();
  // Streak only "counts" if the last completion was today or yesterday; otherwise it's lapsed.
  if (lastDate === today || lastDate === isoYesterday()) return count;
  return 0;
}

/** Call whenever a task is
