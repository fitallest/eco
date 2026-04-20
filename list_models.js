import { GoogleGenAI } from "@google/genai";
import fs from "fs";

async function main() {
    process.env.GEMINI_API_KEY = "AIzaSyBdhKiYHMtpC5Ars8SB_OX9DF8A10r8Qnk";
    const ai = new GoogleGenAI({});
    
    try {
        const response = await ai.models.list();
        for (const model of response.models) {
             console.log(model.name);
        }
    } catch (e) {
        console.error("ERROR listing models", e.message, e);
    }
}
main();
