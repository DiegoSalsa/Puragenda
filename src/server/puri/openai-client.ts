import OpenAI from "openai";

let client: OpenAI | null = null;

export function getPuriOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("PURI_NOT_CONFIGURED");
  client ??= new OpenAI({ apiKey });
  return client;
}

export const PURI_MODEL = process.env.PURI_MODEL ?? "gpt-6-luna";
