import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ExtractInput = z.object({
  text: z.string().min(1),
  now: z.string(),
});

const RecommendInput = z.object({
  now: z.string(),
  tasks: z.array(
    z.object({
      title: z.string(),
      type: z.string(),
      due_date: z.string().nullable(),
      due_time: z.string().nullable(),
      priority: z.string(),
    }),
  ),
});

export const extractItems = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ExtractInput.parse(input))
  .handler(async ({ data }) => {
    const { callAiJson } = await import("./ai.server");

    const result = (await callAiJson({
      instructions: [
        "You extract actionable items from messy messages, emails and notices.",
        "Return every task, deadline and event you find.",
        "type must be one of: task, deadline, event.",
        "priority must be one of: high, medium, low. Judge by urgency and consequence.",
        "due_date must be an ISO date (YYYY-MM-DD) resolved relative to the given current time, or null if truly unknown.",
        "due_time must be 24h HH:MM, or null if no time was mentioned.",
        "Keep titles short, imperative and specific (max ~60 chars).",
        "people: names mentioned that relate to the item, empty array if none.",
      ].join(" "),
      input: `Current date and time: ${data.now}\n\nMessage:\n${data.text}`,
      schemaName: "extracted_items",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                type: { type: "string", enum: ["task", "deadline", "event"] },
                due_date: { type: ["string", "null"] },
                due_time: { type: ["string", "null"] },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                people: { type: "array", items: { type: "string" } },
              },
              required: ["title", "type", "due_date", "due_time", "priority", "people"],
            },
          },
        },
        required: ["items"],
      },
    })) as { items: unknown[] };

    return { items: Array.isArray(result.items) ? result.items : [] };
  });

export const recommendNext = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RecommendInput.parse(input))
  .handler(async ({ data }) => {
    const { callAiJson } = await import("./ai.server");

    if (data.tasks.length === 0) {
      return { title: "", reason: "You have nothing pending — enjoy the clear runway." };
    }

    const result = (await callAiJson({
      instructions: [
        "You are a focus coach. Pick the single best task to do right now.",
        "Weigh deadline proximity, priority, and how well it fits the time of day.",
        "reason must be one short sentence including when it's due and a rough time estimate.",
        "title must match one of the given task titles exactly.",
      ].join(" "),
      input: `Current date and time: ${data.now}\n\nPending items:\n${data.tasks
        .map(
          (t, i) =>
            `${i + 1}. ${t.title} — type: ${t.type}, due: ${t.due_date ?? "no date"} ${
              t.due_time ?? ""
            }, priority: ${t.priority}`,
        )
        .join("\n")}`,
      schemaName: "recommendation",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
        },
        required: ["title", "reason"],
      },
    })) as { title: string; reason: string };

    return result;
  });
