import { GoogleGenAI } from "@google/genai";

async function test() {
    console.log("SDK imported successfully");
    const ai = new GoogleGenAI({ apiKey: "AIzaSyDummy" });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: 'user', parts: [{text: "hello"}] }]
        });
        console.log(response.text);
    } catch (e) {
        console.error("ERROR 1:", e.message);
    }
}
test();
