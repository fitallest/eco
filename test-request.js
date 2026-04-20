async function test() {
    try {
        const fetch = (await import('node-fetch')).default || globalThis.fetch;
        const res = await fetch("http://localhost:3000/api/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: "Quyền nuôi con khi ly hôn",
                history: [],
                agentType: "GENERAL",
                responseStyle: "DEEP",
                userLevel: "Free"
            })
        });
        const text = await res.text();
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", text);
    } catch (e) {
        console.error("FETCH ERROR:", e);
    }
}
test();
