const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

type JsonSchema = Record<string, unknown>;

/**
 * Calls the Anthropic API directly using your own API key and returns parsed JSON.
 * Uses tool-calling to force a structured JSON response matching the given schema.
 */
export async function callAiJson(params: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: JsonSchema;
}): Promise<unknown> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured — missing ANTHROPIC_API_KEY.");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: params.instructions,
      messages: [{ role: "user", content: params.input }],
      tools: [
        {
          name: params.schemaName,
          description: "Return the extracted/recommended data in this exact structure.",
          input_schema: params.schema,
        },
      ],
      tool_choice: { type: "tool", name: params.schemaName },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI is busy right now — please try again in a moment.");
    if (res.status === 401) throw new Error("AI key is invalid. Please check your ANTHROPIC_API_KEY.");
    throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; input?: unknown }[];
  };

  const toolBlock = data.content?.find((c) => c.type === "tool_use");
  if (!toolBlock || typeof toolBlock.input !== "object") {
    throw new Error("The AI returned an unexpected response. Please try again.");
  }

  return toolBlock.input;
}
