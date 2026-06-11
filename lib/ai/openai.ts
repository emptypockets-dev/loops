import type { z } from "zod";
import { OPENAI_CHAT_COMPLETIONS_URL, OPENAI_MODEL, TONE_PREAMBLE } from "../constants";
import type { AiCallResult } from "./types";

/**
 * The one shared OpenAI helper. Runs only inside Convex actions (server-side;
 * the key never reaches the client). Requests strict JSON output, parses it,
 * and validates with zod. Any failure returns a typed fallback — callers
 * surface a toast and never persist invalid data.
 */
export async function callOpenAIJson<T>(options: {
  system: string;
  payload: unknown;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
}): Promise<AiCallResult<T>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "AI isn't configured yet — set OPENAI_API_KEY in your Convex deployment.",
    };
  }

  try {
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${TONE_PREAMBLE}\n\n${options.system}` },
          { role: "user", content: JSON.stringify(options.payload) },
        ],
      }),
    });

    if (!response.ok) {
      // Don't leak provider error bodies to the UI; log server-side instead.
      console.error("OpenAI error", response.status, await response.text());
      return { ok: false, error: `The AI service returned an error (${response.status}). Try again in a moment.` };
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      return { ok: false, error: "The AI returned an empty response. Try again." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, error: "The AI response wasn't valid JSON. Nothing was saved." };
    }

    const validated = options.schema.safeParse(parsed);
    if (!validated.success) {
      console.error("AI validation failed", validated.error.flatten());
      return { ok: false, error: "The AI response didn't pass validation. Nothing was saved." };
    }

    return { ok: true, data: validated.data };
  } catch (err) {
    console.error("OpenAI call failed", err);
    return { ok: false, error: "Couldn't reach the AI service. Your data is untouched." };
  }
}
