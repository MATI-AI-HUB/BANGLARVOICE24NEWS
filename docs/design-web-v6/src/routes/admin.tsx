import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity, ShieldCheck, BarChart3, Smartphone, Bot, ScrollText, Lock, RefreshCw, Check, X,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { listQueue, setQueueStatus, type QueueItem } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "অ্যাডমিন কনসোল — বাংলার ভয়েস" },
      { name: "description", content: "বাংলার ভয়েস নিউজরুম অ্যাডমিন কনসোল — অটোমেশন মনিটর, তথ্য যাচাই, ডেটা সাংবাদিকতা, মোবাইল জার্নালিজম, এআই ও সম্পাদকীয় নীতিমালা।" },
      { property: "og:title", content: "অ্যাডমিন কনসোল — বাংলার ভয়েস" },
      { property: "og:description", content: "নিউজরুম অটোমেশন ও নীতিমালা ব্যবস্থাপনা কনসোল।" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminConsole,
});

type TabKey = "automation" | "factcheck" | "data" | "mojo" | "aipolicy" | "editorial";

const TABS: { key: TabKey; label: string; icon: typeof Activity }[] = [
  { key: "automation", label: "অটোমেশন মনিটর", icon: Activity },
  { key: "factcheck", label: "তথ্য যাচাই", icon: ShieldCheck },
  { key: "data", label: "ডেটা সাংবাদিকতা", icon: BarChart3 },
  { key: "mojo", label: "মোবাইল জার্নালিজম", icon: Smartphone },
  { key: "aipolicy", label: "এআই নীতিমালা", icon: Bot },
  { key: "editorial", label: "সম্পাদকীয় নীতিমালা", icon: ScrollText },
];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="brut p-5">
      <h2 className="font-serif-bn text-xl font-extrabold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function AutomationMonitor({ authKey }: { authKey: string }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listQueue({ data: { key: authKey } });
      setItems(res.items);
      setStats(res.stats);
    } catch {
      setError("সারি লোড করা যায়নি — কী যাচাই করুন।");
    } finally {
      setLoading(false);
    }
  };

  const act = async (id: string, status: "approved" | "rejected") => {
    try {
      await setQueueStatus({ data: { key: authKey, id, status } });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    } catch {
      setError("স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "মোট খসড়া", value: stats.total },
          { label: "অপেক্ষমাণ", value: stats.pending },
          { label: "অনুমোদিত", value: stats.approved },
          { label: "বাতিল", value: stats.rejected },
        ].map((s) => (
          <div key={s.label} className="brut-flat p-3">
            <div className="kicker text-muted-foreground">{s.label}</div>
            <div className="font-display text-2xl">{s.value.toLocaleString("bn-BD")}</div>
          </div>
        ))}
      </div>

      <button
        onClick={load}
        className="inline-flex items-center gap-2 brut-sm brut-press bg-primary px-4 py-2 font-sans text-sm font-extrabold text-primary-foreground"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> সারি রিফ্রেশ করুন
      </button>

      {error && <div className="brut-flat border-primary p-3 text-sm text-primary">{error}</div>}

      <div className="space-y-2">
        {items.length === 0 && !loading && (
          <div className="brut-flat p-4 text-sm text-muted-foreground">
            কোনো খসড়া নেই। অটোমেশন পাইপলাইন <code className="font-sans">POST /api/public/ingest</code> এ খসড়া পাঠাবে।
          </div>
        )}
        {items.map((i) => (
          <article key={i.id} className="brut-flat p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="kicker slab px-2 py-0.5">{i.category}</span>
              <span className="kicker text-muted-foreground">{i.agent}</span>
              <span className={`kicker px-2 py-0.5 ${i.status === "approved" ? "bg-highlight text-ink" : i.status === "rejected" ? "bg-primary text-primary-foreground" : "border-2 border-border"}`}>
                {i.status}
              </span>
            </div>
            <h3 className="mt-2 font-serif-bn text-lg font-extrabold">{i.title}</h3>
            {i.dek && <p className="mt-1 text-sm text-muted-foreground">{i.dek}</p>}
            <div className="mt-2 flex gap-2">
              <button onClick={() => act(i.id, "approved")} className="inline-flex items-center gap-1 brut-flat px-3 py-1.5 text-xs font-bold hover:bg-secondary">
                <Check size={12} /> অনুমোদন
              </button>
              <button onClick={() => act(i.id, "rejected")} className="inline-flex items-center gap-1 brut-flat px-3 py-1.5 text-xs font-bold hover:bg-secondary">
                <X size={12} /> বাতিল
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AdminConsole() {
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<TabKey>("automation");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="section-title mb-6">
          <h1 className="font-serif-bn text-3xl font-extrabold">নিউজরুম অ্যাডমিন কনসোল</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            অটোমেশন মনিটর, তথ্য যাচাই, ডেটা সাংবাদিকতা, মোবাইল জার্নালিজম এবং এআই ও সম্পাদকীয় নীতিমালা—সবকিছু এক জায়গায়।
          </p>
        </div>

        {!unlocked ? (
          <form
            onSubmit={(e) => { e.preventDefault(); if (key.trim()) setUnlocked(true); }}
            className="brut max-w-md p-6"
          >
            <div className="kicker inline-flex items-center gap-2 bg-highlight px-2 py-1 text-ink">
              <Lock size={12} /> সীমাবদ্ধ প্রবেশাধিকার
            </div>
            <h2 className="mt-3 font-serif-bn text-xl font-extrabold">নিউজরুম কী দিন</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              অটোমেশন সারি ও সম্পাদকীয় সিদ্ধান্ত দেখতে সার্ভার-যাচাইকৃত কী প্রয়োজন।
            </p>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="NEWSROOM key"
              className="mt-4 w-full brut-flat px-3 py-2.5 font-sans text-sm outline-none"
            />
            <button className="mt-3 w-full brut-sm brut-press bg-primary px-4 py-2.5 font-sans text-sm font-extrabold text-primary-foreground">
              কনসোলে প্রবেশ
            </button>
          </form>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {TABS.map(({ key: k, label, icon: Icon }) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`flex shrink-0 items-center gap-2 border-2 border-border px-3 py-2 text-left text-sm font-bold ${tab === k ? "slab" : "hover:bg-secondary"}`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </nav>

            <div>
              {tab === "automation" && <AutomationMonitor authKey={key} />}

              {tab === "factcheck" && (
                <Panel title="তথ্য যাচাই কর্মপ্রণালি">
                  <p>প্রতিটি দাবির জন্য অন্তত দুটি স্বাধীন উৎস প্রয়োজন। এআই-সহায়ক খসড়া কখনও যাচাই ছাড়া প্রকাশিত হয় না।</p>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>দাবি শনাক্তকরণ ও উৎস নথিভুক্তকরণ</li>
                    <li>প্রাথমিক নথি/সরকারি তথ্যের সঙ্গে মিলকরণ</li>
                    <li>সংশ্লিষ্ট পক্ষের বক্তব্য গ্রহণ</li>
                    <li>সম্পাদকীয় ডেস্কের চূড়ান্ত অনুমোদন</li>
                    <li>প্রকাশের পর সংশোধনী ট্র্যাকিং</li>
                  </ol>
                </Panel>
              )}

              {tab === "data" && (
                <Panel title="ডেটা সাংবাদিকতা ডেস্ক">
                  <p>বাজেট, জনশুমারি, বাণিজ্য ও জলবায়ু ডেটাসেট থেকে যাচাইযোগ্য প্রতিবেদন তৈরি হয়।</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>প্রতিটি চার্টের সঙ্গে কাঁচা ডেটার লিংক প্রকাশ</li>
                    <li>পদ্ধতি (methodology) নোট বাধ্যতামূলক</li>
                    <li>পুনরুৎপাদনযোগ্য স্ক্রিপ্ট সংরক্ষণ</li>
                  </ul>
                </Panel>
              )}

              {tab === "mojo" && (
                <Panel title="মোবাইল জার্নালিজম (MoJo) নির্দেশিকা">
                  <p>মাঠ প্রতিবেদকদের জন্য মোবাইলভিত্তিক ধারণ, যাচাই ও আপলোড প্রক্রিয়া।</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>ভিডিও: অনুভূমিক ১০৮০p, স্থিতিশীল অডিও, ন্যূনতম ২০ সেকেন্ড b-roll</li>
                    <li>প্রতিটি ফাইলে স্থান, সময় ও সম্মতির নথি</li>
                    <li>এনক্রিপ্টেড আপলোড ও উৎস সুরক্ষা</li>
                  </ul>
                </Panel>
              )}

              {tab === "aipolicy" && (
                <Panel title="এআই ব্যবহারের নীতিমালা">
                  <p>এআই কেবল সহায়ক—সিদ্ধান্ত সর্বদা মানুষ সম্পাদকের।</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>এআই-সহায়ক প্রতিবেদনে সংবাদের শেষে স্পষ্ট ঘোষণা থাকে</li>
                    <li>স্বয়ংক্রিয় খসড়া <code className="font-sans">pending</code> অবস্থায় সারিতে জমা হয়</li>
                    <li>এআই কখনও উৎস তৈরি বা উদ্ধৃতি রচনা করে না</li>
                    <li>ব্যক্তিগত তথ্য এআই প্রম্পটে পাঠানো নিষিদ্ধ</li>
                  </ul>
                </Panel>
              )}

              {tab === "editorial" && (
                <Panel title="সম্পাদকীয় নীতিমালা">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>সংবাদ ও মতামত সম্পূর্ণ পৃথক</li>
                    <li>বিজ্ঞাপন ও স্পন্সরড কনটেন্ট স্পষ্টভাবে চিহ্নিত</li>
                    <li>ভুল হলে ২৪ ঘণ্টার মধ্যে দৃশ্যমান সংশোধনী</li>
                    <li>স্বার্থের দ্বন্দ্ব ঘোষণা বাধ্যতামূলক</li>
                    <li>উৎস সুরক্ষা সর্বোচ্চ অগ্রাধিকার</li>
                  </ul>
                </Panel>
              )}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
