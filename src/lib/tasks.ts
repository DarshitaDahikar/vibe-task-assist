const STORAGE_KEY = "taskpilot:tasks";

function readTasksFromStorage(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTasksToStorage(tasks: Task[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}


export type Priority = "high" | "medium" | "low";
export type ItemType = "task" | "deadline" | "event";

export type Task = {
  id: string;
  title: string;
  type: ItemType;
  due_date: string | null;
  due_time: string | null;
  priority: Priority;
  status: "pending" | "complete";
  created_at: string;
};

export type DraftItem = {
  title: string;
  type: ItemType;
  due_date: string | null;
  due_time: string | null;
  priority: Priority;
};

export const priorityDot: Record<Priority, string> = {
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

export const priorityBadge: Record<Priority, string> = {
  high: "bg-priority-high/12 text-priority-high border-priority-high/25",
  medium: "bg-priority-medium/15 text-priority-medium border-priority-medium/30",
  low: "bg-priority-low/18 text-priority-low border-priority-low/35",
};

export const typeLabel: Record<ItemType, string> = {
  task: "Task",
  deadline: "Deadline",
  event: "Event",
};

export const priorityPill: Record<Priority, { label: string; emoji: string; className: string }> = {
  high: {
    label: "High",
    emoji: "🔴",
    className: "bg-priority-high/12 text-priority-high border-priority-high/35",
  },
  medium: {
    label: "Medium",
    emoji: "🟠",
    className: "bg-priority-medium/15 text-priority-medium border-priority-medium/40",
  },
  low: {
    label: "Low",
    emoji: "🟢",
    className: "bg-priority-low/18 text-priority-low border-priority-low/45",
  },
};

/** "Today", "Tomorrow", "In 3 days", "2 days ago" — relative to the local day. */
export function relativeDay(due_date: string | null): string | null {
  if (!due_date) return null;
  const [y, m, d] = due_date.split("-").map(Number);
  const target = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}


export function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatWhen(due_date: string | null, due_time: string | null) {
  if (!due_date && !due_time) return "No date";
  let label = "";
  if (due_date) {
    const [y, m, d] = due_date.split("-").map(Number);
    const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
    const today = todayISO();
    if (due_date === today) label = "Today";
    else
      label = date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
  }
  if (due_time) {
    const [h, min] = due_time.split(":").map(Number);
    const t = new Date();
    t.setHours(h ?? 0, min ?? 0, 0, 0);
    label += `${label ? " · " : ""}${t.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  return label;
}

export async function fetchTasks(): Promise<Task[]> {
  return readTasksFromStorage();
}

export async function insertTasks(items: DraftItem[]) {
  const existing = readTasksFromStorage();
  const now = new Date().toISOString();
  const newTasks: Task[] = items.map((item) => ({
    id: makeId(),
    title: item.title,
    type: item.type,
    due_date: item.due_date,
    due_time: item.due_time,
    priority: item.priority,
    status: "pending",
    created_at: now,
  }));
  writeTasksToStorage([...existing, ...newTasks]);
}

export async function setTaskStatus(id: string, status: "pending" | "complete") {
  const existing = readTasksFromStorage();
  writeTasksToStorage(
    existing.map((t) => (t.id === id ? { ...t, status } : t)),
  );
}

export async function deleteTask(id: string) {
  const existing = readTasksFromStorage();
  writeTasksToStorage(existing.filter((t) => t.id !== id));
}
