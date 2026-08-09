import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Brain, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { recommendNext } from "@/lib/ai.functions";
import {
  deleteTask,
  fetchTasks,
  formatWhen,
  priorityBadge,
  priorityDot,
  setTaskStatus,
  todayISO,
  typeLabel,
  type Task,
} from "@/lib/tasks";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TaskPilot" },
      {
        name: "description",
        content:
          "See today's and upcoming tasks at a glance, and ask TaskPilot what to work on right now.",
      },
      { property: "og:title", content: "TaskPilot Dashboard" },
      {
        property: "og:description",
        content: "Today and upcoming tasks, with an AI pick for what to do next.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function TaskRow({ task }: { task: Task }) {
  const queryClient = useQueryClient();
  const done = task.status === "complete";

  const toggle = useMutation({
    mutationFn: async () => setTaskStatus(task.id, done ? "pending" : "complete"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const remove = useMutation({
    mutationFn: async () => deleteTask(task.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <li className="surface-card flex items-center gap-3 p-3.5 transition-shadow hover:shadow-lift">
      <span className={`h-9 w-1.5 shrink-0 rounded-full ${priorityDot[task.priority]}`} />
      <Checkbox
        checked={done}
        onCheckedChange={() => toggle.mutate()}
        aria-label="Mark complete"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-semibold ${done ? "text-muted-foreground line-through" : ""}`}
        >
          {task.title}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${priorityBadge[task.priority]}`}
          >
            {typeLabel[task.type]}
          </span>
          {formatWhen(task.due_date, task.due_time)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        onClick={() => remove.mutate()}
        aria-label="Delete task"
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

function Dashboard() {
  const [pick, setPick] = useState<{ title: string; reason: string } | null>(null);
  const recommend = useServerFn(recommendNext);

  const {
    data: tasks = [],
    isLoading,
    error: loadError,
  } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });

  const today = todayISO();
  const pending = tasks.filter((t) => t.status === "pending");
  const todays = tasks.filter((t) => t.due_date === today || (!t.due_date && t.status === "pending"));
  const upcoming = tasks.filter((t) => t.due_date && t.due_date > today);
  const past = tasks.filter((t) => t.due_date && t.due_date < today);

  const ask = useMutation({
    mutationFn: async () =>
      recommend({
        data: {
          now: new Date().toString(),
          tasks: pending.map((t) => ({
            title: t.title,
            type: t.type,
            due_date: t.due_date,
            due_time: t.due_time,
            priority: t.priority,
          })),
        },
      }),
    onSuccess: (res) => setPick(res),
    onError: (e: Error) => toast.error(e.message || "Could not get a recommendation."),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <Button variant="ghost" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" /> Paste something new
          </Link>
        </Button>
        <span className="text-sm font-semibold text-muted-foreground">TaskPilot</span>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <Button
          size="lg"
          className="h-16 w-full rounded-2xl text-base font-bold shadow-lift sm:text-lg"
          disabled={ask.isPending}
          onClick={() => ask.mutate()}
        >
          {ask.isPending ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Thinking...
            </>
          ) : (
            <>
              <Sparkles className="size-5" /> What should I work on now?
            </>
          )}
        </Button>

        {pick && (
          <div className="surface-card mt-4 border-primary/30 bg-primary/5 p-5">
            {pick.title && <p className="text-lg font-bold">Work on: {pick.title}</p>}
            <p className="mt-1 text-sm text-muted-foreground">{pick.reason}</p>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-8">
            <Section title="Today" tasks={todays} isLoading={isLoading} empty="Nothing due today." />
            <Section
              title="Upcoming"
              tasks={upcoming}
              isLoading={isLoading}
              empty="No upcoming items yet."
            />
            {past.length > 0 && (
              <Section title="Earlier" tasks={past} isLoading={false} empty="" />
            )}
          </div>

          <aside className="surface-card h-fit bg-accent/25 p-5">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Brain className="size-4" /> Insight
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You tend to complete coding tasks in the evening — I've scheduled accordingly.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              {pending.length} open item{pending.length === 1 ? "" : "s"} ·{" "}
              {tasks.length - pending.length} completed
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  tasks,
  isLoading,
  empty,
}: {
  title: string;
  tasks: Task[];
  isLoading: boolean;
  empty: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      )}
    </section>
  );
}
