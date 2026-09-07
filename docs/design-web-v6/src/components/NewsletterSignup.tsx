import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function NewsletterSignup({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="brut flex items-center gap-3 p-5">
        <CheckCircle2 className="text-primary" size={22} />
        <div>
          <div className="font-bold">{t("সাবস্ক্রিপশন সম্পন্ন", "You're subscribed")}</div>
          <div className="text-sm text-muted-foreground">
            {t("প্রতি সকালে ইনবক্সে সারসংক্ষেপ পাবেন।", "A morning briefing will arrive in your inbox.")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={`brut ${compact ? "p-5" : "p-6 sm:p-8"}`}>
      <div className="kicker inline-flex items-center gap-2 bg-highlight px-2 py-1 text-ink">
        <Mail size={12} /> {t("নিউজলেটার", "Newsletter")}
      </div>
      <h3 className={`mt-3 font-serif-bn font-extrabold ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
        {t("সকালের ব্রিফিং — প্রতিদিন সকাল ৭টায়", "The Morning Briefing — every day at 7am")}
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {t(
          "দিনের সবচেয়ে জরুরি ৫টি সংবাদ, সম্পাদকীয় বিশ্লেষণ ও তথ্য যাচাইয়ের সারসংক্ষেপ—বিনামূল্যে।",
          "The five stories that matter, plus editorial analysis and fact-check summaries — free.",
        )}
      </p>
      <form
        onSubmit={(e) => { e.preventDefault(); if (email.trim()) setDone(true); }}
        className="mt-4 flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("আপনার ইমেইল ঠিকানা", "Your email address")}
          aria-label={t("ইমেইল", "Email")}
          className="flex-1 brut-flat px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="brut-sm brut-press bg-primary px-5 py-2.5 font-sans text-sm font-extrabold text-primary-foreground"
        >
          {t("সাবস্ক্রাইব", "Subscribe")}
        </button>
      </form>
      <div className="mt-2 font-sans text-[11px] text-muted-foreground">
        {t("স্প্যাম নয় · যেকোনো সময় আনসাবস্ক্রাইব", "No spam · unsubscribe anytime")}
      </div>
    </section>
  );
}
