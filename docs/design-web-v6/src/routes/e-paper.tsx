import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import epaperImg from "@/assets/epaper.jpg";

export const Route = createFileRoute("/e-paper")({
  head: () => ({
    meta: [
      { title: "ই-পেপার — Banglar Voice 24 News" },
      { name: "description", content: "Banglar Voice 24 News আজকের ই-পেপার পড়ুন — interactive printed edition viewer." },
      { property: "og:title", content: "ই-পেপার — Banglar Voice 24 News" },
      { property: "og:description", content: "Interactive printed edition viewer with zoom." },
      { property: "og:url", content: "/e-paper" },
    ],
    links: [{ rel: "canonical", href: "/e-paper" }],
  }),
  component: EPaper,
});

function EPaper() {
  const pages = ["পৃষ্ঠা ১ — শিরোনাম", "পৃষ্ঠা ২ — জাতীয়", "পৃষ্ঠা ৩ — আন্তর্জাতিক", "পৃষ্ঠা ৪ — অর্থনীতি", "পৃষ্ঠা ৫ — খেলাধুলা"];
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);

  const today = new Date().toLocaleDateString("bn-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary">ই-পেপার</div>
            <h1 className="text-3xl font-extrabold">আজকের ই-পেপার</h1>
            <p className="text-sm text-muted-foreground">{today}</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            <Download size={15} /> আজকের ই-পেপার পড়ুন (PDF)
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold">{pages[page]}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))} className="rounded-md border border-border p-2 hover:border-primary"><ZoomOut size={15} /></button>
              <span className="w-12 text-center font-sans text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="rounded-md border border-border p-2 hover:border-primary"><ZoomIn size={15} /></button>
            </div>
          </div>

          <div className="relative grid place-items-center overflow-auto rounded-xl border border-border bg-background/60 p-4">
            <img
              src={epaperImg}
              alt={pages[page]}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}
              className="max-h-[70vh] w-auto rounded shadow-2xl transition-transform"
            />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40">
              <ChevronLeft size={15} /> পূর্ববর্তী
            </button>
            <div className="flex gap-1.5">
              {pages.map((_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`h-2 w-6 rounded-full ${i === page ? "bg-primary" : "bg-border"}`} aria-label={`Page ${i + 1}`} />
              ))}
            </div>
            <button onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))} disabled={page === pages.length - 1} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40">
              পরবর্তী <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
