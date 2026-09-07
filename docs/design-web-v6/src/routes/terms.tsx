import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "ব্যবহারের শর্তাবলি — বাংলার ভয়েস" },
      { name: "description", content: "বাংলার ভয়েস ওয়েবসাইট ব্যবহারের শর্তাবলি, কপিরাইট, পুনঃপ্রকাশ, মন্তব্য নীতি ও দায়সীমা সম্পর্কিত তথ্য।" },
      { property: "og:title", content: "ব্যবহারের শর্তাবলি — বাংলার ভয়েস" },
      { property: "og:description", content: "কপিরাইট, পুনঃপ্রকাশ ও দায়সীমা সম্পর্কিত শর্তাবলি।" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://banglarvoice24news.com/terms" },
    ],
    links: [{ rel: "canonical", href: `${SITE.url}/terms` }],
  }),
  component: Terms,
});

const items: { h: string; p: string }[] = [
  { h: "কপিরাইট", p: "এই সাইটের সব লেখা, ছবি, ভিডিও ও গ্রাফিক্স বাংলার ভয়েস-এর সম্পত্তি। অনুমতি ছাড়া পূর্ণ প্রতিবেদন পুনঃপ্রকাশ করা যাবে না।" },
  { h: "সীমিত উদ্ধৃতি", p: "সূত্র উল্লেখ ও মূল লিংকসহ সর্বোচ্চ ১০০ শব্দ উদ্ধৃত করা যাবে।" },
  { h: "ব্যবহারকারীর দায়িত্ব", p: "সাইটে জমা দেওয়া যেকোনো তথ্য, মন্তব্য বা প্রশ্নের দায় ব্যবহারকারীর। বিদ্বেষমূলক বা বেআইনি বিষয়বস্তু নিষিদ্ধ।" },
  { h: "লার্নিং হাব", p: "লার্নিং হাবের উত্তর সাধারণ তথ্যভিত্তিক সহায়তা; এটি আইনি, চিকিৎসা বা আর্থিক পরামর্শ নয়।" },
  { h: "বিজ্ঞাপন", p: "বিজ্ঞাপন ও স্পন্সরড কনটেন্ট স্পষ্টভাবে চিহ্নিত থাকে এবং সম্পাদকীয় সিদ্ধান্তকে প্রভাবিত করে না।" },
  { h: "দায়সীমা", p: "তথ্যের নির্ভুলতা নিশ্চিত করতে সর্বোচ্চ চেষ্টা করা হয়; তবু কোনো ত্রুটির জন্য সৃষ্ট পরোক্ষ ক্ষতির দায় বাংলার ভয়েস নেবে না।" },
];

function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="section-title">
          <h1 className="font-serif-bn text-3xl font-extrabold sm:text-4xl">ব্যবহারের শর্তাবলি</h1>
        </div>
        <div className="mt-8 space-y-4">
          {items.map((i) => (
            <section key={i.h} className="brut p-5">
              <h2 className="font-serif-bn text-xl font-extrabold">{i.h}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{i.p}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
