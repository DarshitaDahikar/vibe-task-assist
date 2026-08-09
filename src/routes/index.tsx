import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractItems } from "@/lib/ai.functions";
import {
  insertTasks,
  priorityBadge,
  typeLabel,
  type DraftItem,
  type ItemType,
  type Priority,
} from "@/lib/tasks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskPilot — Turn scattered messages into a clear to-do list" },
      {
        name: "description",
        content:
          "Paste any message, email or notice and TaskPilot extracts your tasks, deadlines and events — then tells you what to work on right now.",
      },
      { property: "og:title", content: "TaskPilot — Your messages, organized into action" },
      {
        property: "og:description",
        content:
          "Paste a message and get a clear, prioritized to-do list plus an AI answer to 'what should I work on now?'",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const EXAMPLES = [
  {
    label: "College deadlines",
    text: "Your DBMS assignment is due Thursday. Project review is Friday at 3 PM. Don't forget to send the report to Rahul before Wednesday.",
  },
  {
    label: "Internship notice",
    text: "Reminder: Submit your internship application by this Friday 5 PM. Interview call scheduled for next Monday 11 AM with HR.",
  },
  {
    label: "Team message",
    text: "Team, please finish the UI mockups by tomorrow evening and share the client presentation deck before Thursday's meeting at 2 PM.",
  },
];

function Home() {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<DraftItem[] | null>(null);
  const queryClient = useQueryClient();
  const analyze = useServerFn(extractItems);

  const analyzeMutation = useMutation({
    mutationFn: async () => analyze({ data: { text, now: new Date().toString() } }),
    onSuccess: (res) => {
      const items = (res.items ?? []).map((i) => ({
        title: i.title,
        type: i.type,
        due_date: i.due_date,
        due_time: i.due_time,
        priority: i.priority,
      })) as DraftItem[];
      setDrafts(items);
      if (items.length === 0) toast("No actionable items found in that text.");
    },
    onError: (e: Error) => toast.error(e.message || "Could not analyze that text."),
  });

  const saveMutation = useMutation({
    mutationFn: async (items: DraftItem[]) => insertTasks(items),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Added to your dashboard");
      setDrafts(null);
      setText("");
    },
    onError: () => toast.error("Could not save these items."),
  });

  const updateDraft = (index: number, patch: Partial<DraftItem>) =>
    setDrafts((prev) => prev?.map((d, i) => (i === index ? { ...d, ...patch } : d)) ?? prev);

  return (
    <div className="hero-surface min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wand2 className="size-4" />
          </span>
          TaskPilot
        </span>
        <Button variant="ghost" asChild>
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24">
        <section className="pt-6 text-center sm:pt-12">
          <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Turn scattered messages into a clear to-do list
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground">
            Your deadlines live in WhatsApp groups, email threads and notice boards. Paste any of
            it here — TaskPilot pulls out the tasks, dates and priorities, then tells you what to
            do next.
          </p>
        </section>

        <section className="surface-card mt-8 p-4 sm:p-6">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your message, email, or notice..."
            className="min-h-40 resize-none border-0 bg-secondary/50 text-base focus-visible:ring-1"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <Button
                key={ex.label}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setText(ex.text)}
              >
                {ex.label}
              </Button>
            ))}
          </div>

          <Button
            size="lg"
            className="mt-5 w-full text-base shadow-soft"
            disabled={!text.trim() || analyzeMutation.isPending}
            onClick={() => analyzeMutation.mutate()}
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Reading your message...
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Analyze
              </>
            )}
          </Button>
        </section>

        {drafts && (
          <section className="surface-card mt-6 p-4 sm:p-6">
            <h2 className="text-lg font-bold">
              I found {drafts.length} actionable item{drafts.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tweak anything below before saving it to your dashboard.
            </p>

            <ul className="mt-5 space-y-3">
              {drafts.map((item, i) => (
                <li key={i} className="rounded-xl border border-border bg-secondary/30 p-3">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityBadge[item.priority]}`}
                    >
                      {typeLabel[item.type]}
                    </span>
                    <Input
                      value={item.title}
                      onChange={(e) => updateDraft(i, { title: e.target.value })}
                      className="h-9 flex-1 bg-card font-medium"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={() => setDrafts((p) => p?.filter((_, x) => x !== i) ?? p)}
                      aria-label="Remove item"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Input
                      type="date"
                      value={item.due_date ?? ""}
                      onChange={(e) => updateDraft(i, { due_date: e.target.value || null })}
                      className="h-9 bg-card"
                    />
                    <Input
                      type="time"
                      value={item.due_time?.slice(0, 5) ?? ""}
                      onChange={(e) => updateDraft(i, { due_time: e.target.value || null })}
                      className="h-9 bg-card"
                    />
                    <Select
                      value={item.priority}
                      onValueChange={(v) => updateDraft(i, { priority: v as Priority })}
                    >
                      <SelectTrigger className="h-9 bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High priority</SelectItem>
                        <SelectItem value="medium">Medium priority</SelectItem>
                        <SelectItem value="low">Low priority</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={item.type}
                      onValueChange={(v) => updateDraft(i, { type: v as ItemType })}
                    >
                      <SelectTrigger className="h-9 bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="deadline">Deadline</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                disabled={drafts.length === 0 || saveMutation.isPending}
                onClick={() => saveMutation.mutate(drafts)}
              >
                {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Create All
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setDrafts(null)}>
                Discard
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
