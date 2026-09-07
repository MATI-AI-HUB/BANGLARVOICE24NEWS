import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Send, Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n";

const PROMPTS_BN = ["বাজেট ঘাটতি কী?", "সিভি লেখার নিয়ম", "জলবায়ু তহবিল কীভাবে কাজ করে?"];
const PROMPTS_EN = ["What is a budget deficit?", "How to write a CV", "How does climate finance work?"];

export function LearningHubPanel() {
  const { lang, t } = useLang();
  const [q, setQ] = useState("");
  const prompts = lang === "bn" ? PROMPTS_BN : PROMPTS_EN;

  return (
    <section className="brut p-5">
      <div className="kicker inline-flex items-center gap-2 bg-highlight px-2 py-1 text-ink">
        <BookOpen size={12} /> {t("বাংলার ভয়েস লার্নিং হাব", "Banglar Voice Learning Hub")}
      </div>
      <h2 className="mt-3 font-serif-bn text-2xl font-extrabold leading-tight">
        {t("যেকোনো প্রশ্ন করুন — উত্তর সহজ ভাষায়", "Ask anything — answers in plain language")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          "পড়াশোনা, ক্যারিয়ার, অর্থনীতি কিংবা দৈনন্দিন জিজ্ঞাসা—সহায়ক বাংলায় উত্তর দেবে।",
          "Study, career, economy or everyday questions — the assistant answers in Bangla.",
        )}
      </p>

      <form
        action="/learning-hub"
        method="get"
        className="mt-4 flex items-center border-2 border-border bg-card"
      >
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("আপনার প্রশ্ন লিখুন…", "Type your question…")}
          aria-label={t("প্রশ্ন", "Question")}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
        />
        <button type="submit" aria-label={t("পাঠান", "Send")} className="slab p-2.5">
          <Send size={15} />
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {prompts.map((p) => (
          <Link
            key={p}
            to="/learning-hub"
            search={{ q: p }}
            className="brut-flat px-2 py-1 font-sans text-[11px] font-semibold hover:bg-secondary"
          >
            <Sparkles size={10} className="mr-1 inline" />
            {p}
          </Link>
        ))}
      </div>

      <Link
        to="/learning-hub"
        className="mt-4 block brut-sm brut-press bg-primary px-4 py-2.5 text-center font-sans text-sm font-extrabold text-primary-foreground"
      >
        {t("লার্নিং হাবে যান", "Open the Learning Hub")}
      </Link>
    </section>
  );
}
