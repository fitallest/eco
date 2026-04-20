import { GoogleGenAI } from "@google/genai";
import fs from "fs";

async function main() {
    process.loadEnvFile();
    const ai = new GoogleGenAI();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "hello"
        });
        console.log("SUCCESS gemini-2.5-flash", response.text);
    } catch (e) {
        console.error("ERROR", e.message);
    }
}
main();
