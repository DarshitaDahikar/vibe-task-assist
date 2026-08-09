const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type JsonSchema = Record<string, unknown>;

/**
 * Calls Groq's free API (OpenAI-compatible) and returns parsed JSON.
 * Uses JSON mode plus explicit schema instructions in the prompt, since
 * Groq's JSON mode guarantees valid JSON but doesn't enforce a specific shape.
 */
export async function callAiJson(params: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: JsonSchema;
}): Promise<unknown> {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured — missing GROQ_API_KEY.");

  const systemPrompt = `${params.instructions}

You must respond with ONLY valid JSON matching this exact schema (no markdown, no code fences, no extra text):
${JSON.stringify(params.schema, null, 2)}`;

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: params.input },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("The AI returned an empty response. Please try again.");

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Could not read the AI response.");
  }
}
