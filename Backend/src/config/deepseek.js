import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.DEEPSEEK_API_KEY;

let client;

if (apiKey) {
  client = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey
  });
} else {
  // Lightweight fallback (same idea as your Gemini fallback)
  client = {
    chat: {
      completions: {
        async create({ messages }) {
          return {
            choices: [
              { message: { content: messages.map(m => m.content).join("\n") } }
            ]
          };
        }
      }
    }
  };
}

export const aiClient = client;
export const DEEPSEEK_MODEL =
  process.env.DEEPSEEK_MODEL || "deepseek-chat";
