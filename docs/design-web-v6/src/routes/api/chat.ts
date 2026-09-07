import { createFileRoute } from "@tanstack/react-router";

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM_PROMPT = `তুমি "বাংলার ভয়েস লার্নিং হাব"-এর সহায়ক শিক্ষক।
- সবসময় বাংলা ভাষায় সহজ, স্পষ্ট, বন্ধুত্বপূর্ণ ভাষায় উত্তর দাও।
- জটিল ধারণা উদাহরণ দিয়ে বুঝিয়ে দাও।
- অজানা তথ্যে অনুমান করো না—স্বীকার করো।
- সংবেদনশীল বিষয়ে সাবধান থাকো এবং প্রয়োজনে বিশেষজ্ঞের পরামর্শ নিতে বলো।
- উত্তরে যেখানে সহায়ক, সেখানে সংক্ষিপ্ত তালিকা বা ধাপ ব্যবহার করো।`;

// Bring-your-own-key AI gateway for the Learning Hub chat.
// Banglar Voice is fully standalone: point CHAT_AI_BASE_URL at any
// OpenAI-compatible endpoint (OpenAI, Google Gemini via the OpenAI shim,
// Groq, a self-hosted vLLM/Ollama server, ...). The base URL must support
// streaming chat completions and accept `Authorization: Bearer $CHAT_AI_KEY`.
// Examples:
//   OpenAI:    https://api.openai.com/v1          model: gpt-4o-mini
//   Gemini:    https://generativelanguage.googleapis.com/v1beta/openai
//               model: gemini-2.0-flash  (key = Gemini API key)
//   Groq:      https://api.groq.com/openai/v1     model: llama-3.3-70b-versatile
//   Local:     http://127.0.0.1:11434/v1          model: llama3.1  (Ollama)
const CHAT_AI_BASE_URL = (process.env['CHAT_AI_BASE_URL'] || 'https://api.openai.com/v1').replace(/\/+$/, '');
const CHAT_AI_MODEL = process.env['CHAT_AI_MODEL'] || 'gpt-4o-mini';

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env['CHAT_AI_KEY'];
        if (!key) return new Response("Missing CHAT_AI_KEY - see DEPLOY.md", { status: 500 });

        let body: { messages?: ChatMsg[] };
        try { body = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
        const msgs = Array.isArray(body.messages) ? body.messages : [];
        if (msgs.length === 0) return new Response("messages required", { status: 400 });

        const upstream = await fetch(`${CHAT_AI_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: CHAT_AI_MODEL,
            stream: true,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...msgs],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "");
          if (upstream.status === 429) return new Response("অনেক অনুরোধ—একটু পরে চেষ্টা করুন।", { status: 429 });
          if (upstream.status === 402) return new Response("এআই ক্রেডিট শেষ। কর্মকর্তার সঙ্গে যোগাযোগ করুন।", { status: 402 });
          return new Response(errText || "AI Gateway error", { status: 500 });
        }

        // Transform OpenAI SSE stream to raw text stream
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            let buf = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                  const t = line.trim();
                  if (!t.startsWith("data:")) continue;
                  const data = t.slice(5).trim();
                  if (!data || data === "[DONE]") continue;
                  try {
                    const j = JSON.parse(data);
                    const delta = j?.choices?.[0]?.delta?.content;
                    if (typeof delta === "string" && delta) {
                      controller.enqueue(encoder.encode(delta));
                    }
                  } catch { /* skip malformed */ }
                }
              }
            } catch (e) {
              controller.error(e);
              return;
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
