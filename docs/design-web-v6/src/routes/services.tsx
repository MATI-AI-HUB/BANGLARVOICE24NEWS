import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Server, Code2, Cpu, Sparkles, BadgeCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OrderModal } from "@/components/OrderModal";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "সেবাসমূহ — বাংলার ভয়েস" },
      { name: "description", content: "ডোমেইন ও হোস্টিং, ওয়েবসাইট ও কাস্টম সফটওয়্যার তৈরি, বিজ্ঞাপন প্রোডাকশন এবং সোশ্যাল মিডিয়া ভেরিফিকেশন সহায়তা।" },
      { property: "og:title", content: "সেবাসমূহ — বাংলার ভয়েস" },
      { property: "og:description", content: "প্রিমিয়াম ডিজিটাল ও মিডিয়া সেবাসমূহ।" },
      { property: "og:url", content: "https://banglarvoice24news.com/services" },
    ],
    links: [{ rel: "canonical", href: "https://banglarvoice24news.com/services" }],
  }),
  component: Services,
});

const services = [
  { icon: Server, name: "ডোমেইন ও হোস্টিং সার্ভিস", en: "Premium Cloud Hosting Solutions" },
  { icon: Code2, name: "ওয়েবসাইট ডিজাইন ও তৈরি", en: "Modern React & Next.js Development" },
  { icon: Cpu, name: "কাস্টম সফটওয়্যার তৈরি", en: "Tailored Enterprise Software" },
  { icon: Sparkles, name: "প্রফেশনাল বিজ্ঞাপন তৈরি", en: "Dynamic Video & Graphic Production" },
  { icon: BadgeCheck, name: "সোশ্যাল মিডিয়া ভেরিফিকেশন সহায়তা", en: "Meta Blue Badge Assistance" },
];

function Services() {
  const [open, setOpen] = useState(false);
  const [svc, setSvc] = useState<string | undefined>();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="section-title mb-6">
          <h1 className="font-serif-bn text-3xl font-extrabold">আমাদের সেবাসমূহ</h1>
        </div>
        <p className="max-w-3xl text-muted-foreground">প্রতিষ্ঠান, উদ্যোক্তা ও গণমাধ্যমের জন্য আমাদের নির্বাচিত ডিজিটাল ও মিডিয়া সেবা।</p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map(s => (
            <div key={s.name} className="rounded-md border border-border bg-card p-5">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                <s.icon size={20} />
              </div>
              <h3 className="mt-4 font-serif-bn text-lg font-bold">{s.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground font-sans">{s.en}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setSvc(s.name); setOpen(true); }} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">অর্ডার করুন</button>
                <button onClick={() => { setSvc(s.name); setOpen(true); }} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary">যোগাযোগ</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
      <OrderModal open={open} service={svc} onClose={() => setOpen(false)} />
    </div>
  );
}
