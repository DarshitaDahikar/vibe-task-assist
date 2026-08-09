const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

type JsonSchema = Record<string, unknown>;

/**
 * Gemini's schema format is a subset of OpenAPI and rejects unsupported keys
 * like "additionalProperties". Strip those recursively before sending.
 */
function toGeminiSchema(schema: JsonSchema): JsonSchema {
  const clone: JsonSchema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties") continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      clone[key] = toGeminiSchema(value as JsonSchema);
    } else if (Array.isArray(value)) {
      clone[key] = value.map((v) =>
        v && typeof v === "object" ? toGeminiSchema(v as JsonSchema) : v,
      );
    } else {
      clone[key] = value;
    }
  }
  return clone;
}

/**
 * Calls Google's free Gemini API and returns parsed JSON matching the given schema.
 * Uses Gemini's built-in structured output (responseSchema) — no paid tier required.
 */
export async function callAiJson(params: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: JsonSchema;
}): Promise<unknown> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured — missing GEMINI_API_KEY.");

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.instructions }] },
      contents: [{ role: "user", parts: [{ text: params.input }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: toGeminiSchema(params.schema),
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI is busy right now — please try again in a moment.");
    if (res.status === 400 && detail.includes("API_KEY_INVALID")) {
      throw new Error("AI key is invalid. Please check your GEMINI_API_KEY.");
    }
    throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("The AI returned an empty response. Please try again.");

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Could not read the AI response.");
  }
}
