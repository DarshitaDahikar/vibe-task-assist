import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

const OWNER_COOKIE = "taskpilot_owner";

function getOwnerToken(create: boolean): string | null {
  const existing = getCookie(OWNER_COOKIE);
  if (existing && /^[a-f0-9]{32,64}$/.test(existing)) return existing;
  if (!create) return null;
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  setCookie(OWNER_COOKIE, token, {
    httpOnly: true,
    // "none" so the cookie is still sent when the app runs inside the
    // embedded preview iframe (cross-site context). Without this the owner
    // token is dropped and the dashboard reads back zero tasks.
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return token;
}

const DraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(["task", "deadline", "event"]),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  due_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable(),
  priority: z.enum(["high", "medium", "low"]),
});

const IdSchema = z.object({ id: z.string().uuid() });

export const listTasksFn = createServerFn({ method: "GET" }).handler(async () => {
  const owner = getOwnerToken(false);
  if (!owner) return { tasks: [] };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("id,title,type,due_date,due_time,priority,status,created_at")
    .eq("owner_token", owner)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[tasks] list failed", error);
    throw new Error("Could not load tasks.");
  }
  return { tasks: data ?? [] };
});

export const createTasksFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ items: z.array(DraftSchema).min(1).max(50) }).parse(input))
  .handler(async ({ data }) => {
    const owner = getOwnerToken(true)!;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tasks").insert(
      data.items.map((i) => ({ ...i, status: "pending", owner_token: owner })),
    );
    if (error) {
      console.error("[tasks] insert failed", error);
      throw new Error("Could not save tasks.");
    }
    return { ok: true };
  });

export const setTaskStatusFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    IdSchema.extend({ status: z.enum(["pending", "complete"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const owner = getOwnerToken(false);
    if (!owner) throw new Error("Task not found.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tasks")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("owner_token", owner);
    if (error) {
      console.error("[tasks] update failed", error);
      throw new Error("Could not update task.");
    }
    return { ok: true };
  });

export const deleteTaskFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const owner = getOwnerToken(false);
    if (!owner) throw new Error("Task not found.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("id", data.id)
      .eq("owner_token", owner);
    if (error) {
      console.error("[tasks] delete failed", error);
      throw new Error("Could not delete task.");
    }
    return { ok: true };
  });
