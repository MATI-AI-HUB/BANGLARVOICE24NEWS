import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "গোপনীয়তা নীতি — বাংলার ভয়েস" },
      { name: "description", content: "বাংলার ভয়েস কীভাবে পাঠকের তথ্য সংগ্রহ, ব্যবহার ও সুরক্ষা করে, কুকি ও বিজ্ঞাপন অংশীদারদের ভূমিকা সহ বিস্তারিত গোপনীয়তা নীতি।" },
      { property: "og:title", content: "গোপনীয়তা নীতি — বাংলার ভয়েস" },
      { property: "og:description", content: "কুকি, বিজ্ঞাপন ও ব্যক্তিগত তথ্য সুরক্ষা সম্পর্কিত নীতি।" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://banglarvoice24news.com/privacy" },
    ],
    links: [{ rel: "canonical", href: `${SITE.url}/privacy` }],
  }),
  component: Privacy,
});

const sections: { h: string; p: string[] }[] = [
  {
    h: "কোন তথ্য সংগ্রহ করা হয়",
    p: [
      "সাইট ব্যবহারের সময় আমরা ব্রাউজারের ধরন, আনুমানিক অবস্থান, পঠিত পাতা ও রেফারার সংগ্রহ করি—সম্পূর্ণ পরিসংখ্যানগত উদ্দেশ্যে।",
      "নিউজলেটারে সাবস্ক্রাইব করলে কেবল ইমেইল ঠিকানা সংরক্ষণ করা হয়। লার্নিং হাবের কথোপকথন আপনার নিজের ব্রাউজারে সংরক্ষিত থাকে।",
    ],
  },
  {
    h: "কুকি ও অনুরূপ প্রযুক্তি",
    p: [
      "ভাষা নির্বাচন ও থিম (দিন/রাত/চোখ সুরক্ষা) মনে রাখতে আমরা লোকাল স্টোরেজ ব্যবহার করি।",
      "বিজ্ঞাপন অংশীদার, যেমন Google AdSense, প্রাসঙ্গিক বিজ্ঞাপন দেখাতে কুকি ব্যবহার করতে পারে। ব্যবহারকারী Google Ads Settings থেকে ব্যক্তিগতকৃত বিজ্ঞাপন বন্ধ করতে পারেন।",
    ],
  },
  {
    h: "তৃতীয় পক্ষের বিজ্ঞাপন",
    p: [
      "তৃতীয় পক্ষের বিজ্ঞাপন সরবরাহকারীরা তাদের নিজস্ব গোপনীয়তা নীতির অধীনে পরিচালিত হয়। বাংলার ভয়েস তাদের সংগৃহীত তথ্যের ওপর নিয়ন্ত্রণ রাখে না।",
    ],
  },
  {
    h: "তথ্য সুরক্ষা ও সংরক্ষণকাল",
    p: [
      "সব সংযোগ HTTPS-এ এনক্রিপ্টেড। প্রয়োজনের অতিরিক্ত সময় কোনো ব্যক্তিগত তথ্য সংরক্ষণ করা হয় না।",
      "আপনি যেকোনো সময় ইমেইলের মাধ্যমে আপনার তথ্য মুছে ফেলার অনুরোধ করতে পারেন।",
    ],
  },
  {
    h: "শিশুদের গোপনীয়তা",
    p: ["আমরা জেনেশুনে ১৩ বছরের কম বয়সী কারও কাছ থেকে ব্যক্তিগত তথ্য সংগ্রহ করি না।"],
  },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="section-title">
          <h1 className="font-serif-bn text-3xl font-extrabold sm:text-4xl">গোপনীয়তা নীতি</h1>
        </div>
        <p className="mt-4 text-muted-foreground">
          বাংলার ভয়েস পাঠকের গোপনীয়তাকে সর্বোচ্চ গুরুত্ব দেয়। এই নীতিতে আমরা কী তথ্য সংগ্রহ করি, কেন করি এবং কীভাবে তা সুরক্ষিত রাখি তা ব্যাখ্যা করা হয়েছে।
        </p>
        <div className="mt-8 space-y-6">
          {sections.map((s) => (
            <section key={s.h} className="brut p-5">
              <h2 className="font-serif-bn text-xl font-extrabold">{s.h}</h2>
              {s.p.map((t) => (
                <p key={t} className="mt-2 text-sm text-muted-foreground">{t}</p>
              ))}
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          প্রশ্ন থাকলে যোগাযোগ করুন:{" "}
          <a className="font-sans underline hover:text-primary" href="mailto:editor@banglarvoice24news.com">
            banglarvoice24news.com
          </a>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
