import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE, organizationJsonLd } from "@/lib/site";
import { ShieldCheck, Scale, PenLine, Users, Wallet, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "সম্পাদকীয় নীতিমালা ও আমাদের সম্পর্কে — বাংলার ভয়েস" },
      { name: "description", content: "বাংলার ভয়েসের সম্পাদকীয় স্বাধীনতা, তথ্য যাচাই পদ্ধতি, সংশোধনী নীতি, মালিকানা ও অর্থায়ন এবং এআই ব্যবহারের স্বচ্ছ ঘোষণা।" },
      { property: "og:title", content: "সম্পাদকীয় নীতিমালা — বাংলার ভয়েস" },
      { property: "og:description", content: "সত্য, নিরপেক্ষতা ও জবাবদিহিতা রক্ষায় বাংলার ভয়েস যে মানদণ্ড অনুসরণ করে।" },
      { property: "og:url", content: "https://banglarvoice24news.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://banglarvoice24news.com/about" }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(organizationJsonLd()) },
    ],
  }),
  component: AboutPage,
});

const sections = [
  {
    id: "masthead",
    icon: PenLine,
    title: "সম্পাদকীয় কাঠামো",
    body: [
      "বাংলার ভয়েস একটি স্বাধীন সম্পাদকীয় পর্ষদ দ্বারা পরিচালিত। প্রতিটি প্রতিবেদন প্রকাশের আগে অন্তত দুইজন সম্পাদকীয় সদস্যের পাঠ ও অনুমোদনের মধ্য দিয়ে যায়।",
      "সংবাদকক্ষ ২৪ ঘণ্টা সক্রিয় থাকে; রাত ও ছুটির দিনেও দায়িত্বপ্রাপ্ত সম্পাদক নিযুক্ত থাকেন।",
    ],
  },
  {
    id: "factcheck",
    icon: ShieldCheck,
    title: "তথ্য যাচাই পদ্ধতি",
    body: [
      "প্রতিটি তথ্যের জন্য অন্তত দুটি স্বাধীন সূত্র নিশ্চিত করা হয়। একক সূত্রনির্ভর সংবাদ প্রকাশিত হলে তা স্পষ্টভাবে উল্লেখ করা হয়।",
      "ছবি ও ভিডিওর উৎস, ধারণকালের সময় এবং স্থান যাচাই ছাড়া প্রকাশ করা হয় না। প্রতীকী ছবি ব্যবহারের ক্ষেত্রে তা ক্যাপশনে লেখা থাকে।",
    ],
  },
  {
    id: "ai",
    icon: Scale,
    title: "কৃত্রিম বুদ্ধিমত্তা ব্যবহারের ঘোষণা",
    body: [
      "সংবাদ সংগ্রহ, অনুবাদ, সারসংক্ষেপ ও ভাষাগত সম্পাদনায় আমরা এআই সহায়তা নিই। তবে প্রকাশের চূড়ান্ত সিদ্ধান্ত সর্বদা মানুষ সম্পাদকের।",
      "যেসব প্রতিবেদনে এআই সহায়তা নেওয়া হয়েছে, প্রতিবেদনের শেষে সংক্ষেপে সূত্র ও ‘এআই সহায়তায় সম্পাদিত’ নোট যুক্ত থাকে।",
      "এআই কখনো স্বয়ংক্রিয়ভাবে সংবাদ প্রকাশ করে না; স্বয়ংক্রিয় প্রবাহ থেকে আসা প্রতিটি খসড়া সম্পাদকীয় সারিতে অপেক্ষমাণ থাকে।",
    ],
  },
  {
    id: "corrections",
    icon: MessageSquare,
    title: "সংশোধনী ও অভিযোগ",
    body: [
      "ভুল ধরা পড়লে আমরা তা দ্রুততম সময়ে সংশোধন করি এবং প্রতিবেদনের নিচে সংশোধনীর তারিখসহ নোট যুক্ত করি। ভুল আড়াল করার জন্য নীরব সম্পাদনা করা হয় না।",
      `অভিযোগ বা সংশোধনীর অনুরোধ পাঠান: ${SITE.email}। সাত কর্মদিবসের মধ্যে উত্তর দেওয়া হয়।`,
    ],
  },
  {
    id: "ownership",
    icon: Wallet,
    title: "মালিকানা, অর্থায়ন ও বিজ্ঞাপন",
    body: [
      "বাংলার ভয়েসের আয়ের উৎস—বিজ্ঞাপন, স্পনসরড কনটেন্ট এবং প্রতিষ্ঠানের আইটি সেবা বিভাগ। কোনো রাজনৈতিক দল বা গোষ্ঠীর অর্থায়ন গ্রহণ করা হয় না।",
      "বিজ্ঞাপন ও স্পনসরড কনটেন্ট সবসময় ‘বিজ্ঞাপন’ লেবেলে আলাদা করে চিহ্নিত থাকে। বিজ্ঞাপনদাতার কোনো প্রভাব সম্পাদকীয় সিদ্ধান্তে নেই।",
    ],
  },
  {
    id: "diversity",
    icon: Users,
    title: "বৈচিত্র্য ও প্রতিনিধিত্ব",
    body: [
      "সংবাদ নির্বাচনে ভৌগোলিক, লৈঙ্গিক ও সামাজিক বৈচিত্র্য বজায় রাখার চেষ্টা করা হয়। প্রান্তিক জনগোষ্ঠীর কণ্ঠস্বরকে অগ্রাধিকার দেওয়া হয়।",
    ],
  },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-xs font-sans uppercase tracking-[0.2em] text-primary">আস্থার ভিত্তি</p>
        <h1 className="mt-2 font-serif-bn text-4xl font-extrabold leading-tight">সম্পাদকীয় নীতিমালা ও আমাদের সম্পর্কে</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {SITE.name} একটি জাতীয় ও আন্তর্জাতিক সংবাদমাধ্যম। আমাদের একমাত্র অঙ্গীকার পাঠকের প্রতি—নির্ভুল তথ্য,
          স্বচ্ছ পদ্ধতি এবং ভুল হলে খোলাখুলি সংশোধন।
        </p>

        <div id="ethics" className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 rounded-md border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-primary/10 p-2 text-primary"><s.icon size={18} /></span>
                <h2 className="font-serif-bn text-2xl font-extrabold">{s.title}</h2>
              </div>
              <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
                {s.body.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>
          ))}
        </div>

        <section id="feedback" className="mt-10 scroll-mt-24 rounded-md border border-border bg-secondary/40 p-6">
          <h2 className="font-serif-bn text-xl font-extrabold">যোগাযোগ</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            সম্পাদকীয় দপ্তর · ঢাকা, বাংলাদেশ ·{" "}
            <a href={`mailto:${SITE.email}`} className="font-sans text-primary hover:underline">{SITE.email}</a>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
