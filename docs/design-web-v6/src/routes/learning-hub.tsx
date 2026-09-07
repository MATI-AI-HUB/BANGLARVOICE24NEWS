import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Send, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/learning-hub")({
  head: () => ({
    meta: [
      { title: "বাংলার ভয়েস লার্নিং হাব — বাংলায় প্রশ্নের উত্তর" },
      { name: "description", content: "শিক্ষা, ক্যারিয়ার, সাধারণ জ্ঞান কিংবা যেকোনো প্রশ্ন—বাংলার ভয়েস লার্নিং হাব বাংলায় সহজ ভাষায় উত্তর দেয়।" },
      { property: "og:title", content: "বাংলার ভয়েস লার্নিং হাব" },
      { property: "og:description", content: "বাংলায় প্রশ্নের সহজ উত্তর।" },
      { property: "og:url", content: "https://banglarvoice24news.com/learning-hub" },
    ],
    links: [{ rel: "canonical", href: "https://banglarvoice24news.com/learning-hub" }],
  }),
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof s['q'] === "string" && s['q'].trim() ? s['q'].trim().slice(0, 400) : undefined,
  }),
  component: LearningHub,
});

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "bv-learning-hub-v1";

function LearningHub() {
  const { q: seedQuestion } = Route.useSearch();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState(seedQuestion ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch { /* ignore */ }
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: text }, { role: "assistant", content: "" }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const copy = prev.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "সাময়িক সমস্যা হয়েছে, একটু পরে আবার চেষ্টা করুন।";
      setError(msg);
      setMessages(prev => {
        const copy = prev.slice();
        if (copy[copy.length - 1]?.role === "assistant" && !copy[copy.length - 1]?.content) copy.pop();
        return copy;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const suggestions = [
    "SSC পরীক্ষার জন্য কীভাবে পড়াশোনা গুছাব?",
    "মুদ্রাস্ফীতি সহজ ভাষায় বোঝাও",
    "একটি ভালো CV কীভাবে লিখব?",
    "স্বাস্থ্যকর দৈনন্দিন রুটিন সাজানোর টিপস",
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <BookOpen size={18} />
          </div>
          <div>
            <h1 className="font-serif-bn text-2xl sm:text-3xl font-extrabold">বাংলার ভয়েস লার্নিং হাব</h1>
            <p className="text-sm text-muted-foreground">আপনার যেকোনো প্রশ্ন করুন—উত্তর পাবেন সহজ বাংলায়।</p>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-border bg-card">
          <div ref={scrollRef} className="h-[55vh] overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div>
                <p className="text-sm text-muted-foreground mb-4">কী নিয়ে জানতে চান? একটি প্রশ্ন বেছে নিন অথবা নিজেই লিখুন—</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-left rounded-md border border-border bg-background px-3 py-2 text-sm hover:border-primary hover:text-primary">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                  {m.role === "user" ? (
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
                      {m.content}
                    </div>
                  ) : (
                    <div className="prose-article max-w-none text-[15px]">
                      {m.content ? (
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="animate-spin" size={14} /> উত্তর তৈরি হচ্ছে…
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-end gap-2 border-t border-border p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              rows={2}
              placeholder="এখানে আপনার প্রশ্ন লিখুন…"
              className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {messages.length > 0 && (
              <button type="button" onClick={clear} aria-label="Clear" className="rounded-md border border-border p-2 text-muted-foreground hover:text-destructive hover:border-destructive">
                <Trash2 size={16} />
              </button>
            )}
            <button type="submit" disabled={loading || !input.trim()} className="rounded-md bg-primary p-2.5 text-primary-foreground disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            </button>
          </form>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          এই সহায়ক উত্তরগুলো এআই-এর মাধ্যমে তৈরি। সংবেদনশীল বিষয়ে সিদ্ধান্তের আগে যাচাই করে নিন।
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
