import OpenAI from "openai";
import { getEnv } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: getEnv().OPENAI_API_KEY });
  }
  return client;
}
