import { createFileRoute } from "@tanstack/react-router";
import { Mail, Linkedin, Clock, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "যোগাযোগ — বাংলার ভয়েস" },
      { name: "description", content: "বাংলার ভয়েস সম্পাদকীয় দপ্তরের সঙ্গে যোগাযোগ, সংবাদ পাঠানো, সংশোধনীর অনুরোধ ও বিজ্ঞাপন সংক্রান্ত তথ্য।" },
      { property: "og:title", content: "যোগাযোগ — বাংলার ভয়েস" },
      { property: "og:description", content: "সম্পাদকীয় দপ্তর, সংশোধনী ও বিজ্ঞাপন যোগাযোগ।" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://banglarvoice24news.com/contact" },
    ],
    links: [{ rel: "canonical", href: `${SITE.url}/contact` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "যোগাযোগ — বাংলার ভয়েস",
          url: `${SITE.url}/contact`,
        }),
      },
    ],
  }),
  component: Contact,
});

function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="section-title">
          <h1 className="font-serif-bn text-3xl font-extrabold sm:text-4xl">যোগাযোগ</h1>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="brut p-6">
            <div className="kicker text-muted-foreground">ইমেইল</div>
            <a href="mailto:editor@banglarvoice24news.com" className="mt-2 flex items-center gap-2 font-sans text-lg font-extrabold hover:text-primary">
              <Mail size={18} /> banglarvoice24news.com
            </a>
            <p className="mt-3 text-sm text-muted-foreground">
              সংবাদ, তথ্য, সংশোধনীর অনুরোধ কিংবা বিজ্ঞাপন—সব বিষয়ে এই ঠিকানায় লিখুন। সাধারণত ২৪ কর্মঘণ্টার মধ্যে উত্তর দেওয়া হয়।
            </p>
          </section>

          <section className="brut p-6">
            <div className="kicker text-muted-foreground">সোশ্যাল</div>
            <div className="mt-3 flex gap-2">
              <a href="https://www.linkedin.com/company/banglarvoice24news" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 brut-flat brut-press px-3 py-2 font-sans text-sm font-bold">
                <Linkedin size={16} /> LinkedIn
              </a>
              <a href="https://x.com/banglarvoice24" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 brut-flat brut-press px-3 py-2 font-sans text-sm font-bold">
                <XLogo /> X
              </a>
            </div>
            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><MapPin size={14} /> ঢাকা, বাংলাদেশ</div>
              <div className="flex items-center gap-2"><Clock size={14} /> নিউজরুম ২৪/৭ সক্রিয়</div>
            </div>
          </section>
        </div>

        <section className="mt-5 brut p-6">
          <h2 className="font-serif-bn text-xl font-extrabold">সংশোধনীর অনুরোধ</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            কোনো প্রতিবেদনে ভুল চোখে পড়লে প্রতিবেদনের লিংক ও ভুলের বিবরণ পাঠান। যাচাইয়ের পর ২৪ ঘণ্টার মধ্যে দৃশ্যমান সংশোধনী প্রকাশ করা হয়।
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
