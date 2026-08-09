import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function insertTasks(items: DraftItem[]) {
  const { error } = await supabase.from("tasks").insert(
    items.map((i) => ({
      title: i.title,
      type: i.type,
      due_date: i.due_date,
      due_time: i.due_time,
      priority: i.priority,
      status: "pending",
    })),
  );
  if (error) throw error;
}

export async function setTaskStatus(id: string, status: "pending" | "complete") {
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
