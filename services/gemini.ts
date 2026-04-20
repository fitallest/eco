import { GoogleGenAI, Chat } from "@google/genai";
import { ModelNames } from "../types";

// Initialize the API client
// CRITICAL: The API key must be strictly from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: ModelNames.FLASH,
    config: {
      temperature: 0.7,
      systemInstruction: "You are a helpful, friendly, and knowledgeable AI assistant. You answer concisely and clearly.",
    },
  });
};
