import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GENAI_API_KEY || process.env.GEMINI_API_KEY;

// Provide a lightweight fallback client when no API key is present
let client;
if (apiKey) {
	client = new GoogleGenAI({ apiKey });
} else {
	client = {
		models: {
			async generateContent({ contents }) {
				// Return contents back to caller in a simple shape so downstream formatting works
				return { output: [{ text: typeof contents === "string" ? contents : JSON.stringify(contents) }] };
			}
		}
	};
}

export const aiClient = client;
export const GENAI_MODEL = process.env.GENAI_MODEL || "gemini-2.5-flash-lite";
