import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Brain, Flame, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfettiBurst } from "@/components/confetti-burst";
import { ProgressRing } from "@/components/progress-ring";
import { ThemeToggle } from "@/components/theme-toggle";
import { recommendNext } from "@/lib/ai.functions";
import { getStreak, recordCompletion, timeOfDayGreeting } from "@/lib/streak";
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
  const [celebrate, setCelebrate] = useState(false);

  const toggle = useMutation({
    mutationFn: async () => setTaskStatus(task.id, done ? "pending" : "complete"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (!done) {
        recordCompletion();
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 900);
      }
    },
  });
  const remove = useMutation({
    mutationFn: async () => deleteTask(task.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <li className="animate-task-in surface-card relative flex items-center gap-3 overflow-visible p-3.5 transition-shadow hover:shadow-lift">
      {celebrate && <ConfettiBurst />}
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

  // Re-read on every render so it updates right after a task is completed
  // (tasks query invalidation triggers this re-render).
  const streak = getStreak();
  const greeting = timeOfDayGreeting();

  const today = todayISO();
  const pending = tasks.filter((t) => t.status === "pending");
  const todays = tasks.filter((t) => t.due_date === today || (!t.due_date && t.status === "pending"));
  const upcoming = tasks.filter((t) => t.due_date && t.due_date > today);
  const past = tasks.filter((t) => t.due_date && t.due_date < today);

  const todaysAll = tasks.filter((t) => t.due_date === today);
  const todaysDone = todaysAll.filter((t) => t.status === "complete").length;
  const todaysPercent = todaysAll.length > 0 ? (todaysDone / todaysAll.length) * 100 : 0;

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
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-muted-foreground">TaskPilot</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold sm:text-2xl">{greeting} 👋</h1>
          {streak > 0 && (
            <span className="surface-card flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-priority-medium">
              <Flame className="size-4 fill-priority-medium/20" />
              {streak} day{streak === 1 ? "" : "s"} streak
            </span>
          )}
        </div>

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

        {loadError && (
          <div className="surface-card mt-4 border-destructive/40 bg-destructive/5 p-4 text-sm font-medium text-destructive">
            {(loadError as Error).message || "Could not load your tasks."}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">

          <div className="space-y-8">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Today
                </h2>
                {todaysAll.length > 0 && <ProgressRing percent={todaysPercent} size={40} />}
              </div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : todays.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing due today.</p>
              ) : (
                <ul className="space-y-2.5">
                  {todays.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </ul>
              )}
            </section>
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
