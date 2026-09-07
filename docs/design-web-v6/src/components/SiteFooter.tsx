import { Link } from "@tanstack/react-router";
import { Download, Linkedin, Mail } from "lucide-react";
import { useLang } from "@/lib/i18n";

function XLogo({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function SiteFooter() {
  const { t } = useLang();
  return (
    <footer className="mt-12 border-t-4 border-border bg-secondary">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-serif-bn text-2xl font-extrabold">
            বাংলার <span className="text-primary">ভয়েস</span>
          </div>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t(
              "স্বাধীন সম্পাদকীয় নীতিতে পরিচালিত একটি জাতীয় ও আন্তর্জাতিক সংবাদমাধ্যম। আমাদের লক্ষ্য—নির্ভুল, নিরপেক্ষ ও দায়িত্বশীল সাংবাদিকতা।",
              "An independent national and international news organisation committed to accurate, impartial and responsible journalism.",
            )}
          </p>

          <div className="mt-5 brut-flat p-4">
            <div className="kicker text-muted-foreground">{t("যোগাযোগ", "Contact")}</div>
            <a
              href="mailto:editor@banglarvoice24news.com"
              className="mt-2 flex items-center gap-2 font-sans text-sm font-bold hover:text-primary"
            >
              <Mail size={14} /> banglarvoice24news.com
            </a>
            <div className="mt-3 flex items-center gap-2">
              <a
                href="https://www.linkedin.com/company/banglarvoice24news"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="LinkedIn"
                className="brut-flat brut-press p-2 hover:text-primary"
              >
                <Linkedin size={14} />
              </a>
              <a
                href="https://x.com/banglarvoice24"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="X"
                className="brut-flat brut-press p-2 hover:text-primary"
              >
                <XLogo />
              </a>
            </div>
          </div>

          <p className="mt-4 border-l-4 border-primary bg-card p-3 text-xs text-muted-foreground">
            {t(
              "সম্পাদক ও প্রকাশনা প্যানেল দ্বারা পরিচালিত। তথ্য অধিকার আইন (RTI) সহ প্রযোজ্য সকল বিধিমালা মেনে প্রকাশিত।",
              "Operated by an editorial and publication panel, published in compliance with applicable regulations including the Right to Information Act.",
            )}
          </p>
        </div>

        <div>
          <div className="kicker">{t("বিভাগ", "Sections")}</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/category/$cat" params={{ cat: "national" }} className="hover:text-primary">{t("জাতীয়", "National")}</Link></li>
            <li><Link to="/category/$cat" params={{ cat: "international" }} className="hover:text-primary">{t("আন্তর্জাতিক", "World")}</Link></li>
            <li><Link to="/category/$cat" params={{ cat: "economy" }} className="hover:text-primary">{t("অর্থনীতি", "Economy")}</Link></li>
            <li><Link to="/category/$cat" params={{ cat: "sports" }} className="hover:text-primary">{t("খেলাধুলা", "Sports")}</Link></li>
            <li><Link to="/category/$cat" params={{ cat: "opinion" }} className="hover:text-primary">{t("মতামত", "Opinion")}</Link></li>

            <li><Link to="/learning-hub" className="hover:text-primary">{t("লার্নিং হাব", "Learning Hub")}</Link></li>
          </ul>
        </div>

        <div>
          <div className="kicker">{t("প্রতিষ্ঠান", "Company")}</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary">{t("আমাদের সম্পর্কে", "About us")}</Link></li>
            <li><Link to="/contact" className="hover:text-primary">{t("যোগাযোগ", "Contact")}</Link></li>
            <li><Link to="/privacy" className="hover:text-primary">{t("গোপনীয়তা নীতি", "Privacy Policy")}</Link></li>
            <li><Link to="/terms" className="hover:text-primary">{t("ব্যবহারের শর্তাবলি", "Terms of Use")}</Link></li>
            <li><Link to="/services" className="hover:text-primary">{t("সেবাসমূহ", "IT Services")}</Link></li>
            <li><Link to="/search" className="hover:text-primary">{t("সংবাদ অনুসন্ধান", "Search")}</Link></li>
            <li><a href="/rss.xml" className="font-sans hover:text-primary">RSS</a></li>
            <li><Link to="/admin" className="font-sans hover:text-primary">{t("অ্যাডমিন কনসোল", "Admin Console")}</Link></li>
          </ul>
          <a
            href="/api/public/download-source"
            className="mt-4 inline-flex items-center gap-2 brut-sm brut-press px-3 py-2 font-sans text-xs font-extrabold"
          >
            <Download size={13} /> {t("সোর্স কোড (GCP VM Ready)", "Source code (GCP VM Ready)")}
          </a>
        </div>
      </div>

      <div className="border-t-2 border-border py-4 text-center font-sans text-xs text-muted-foreground">
        © {new Date().getFullYear()} বাংলার ভয়েস · banglarvoice24news.com · {t("সর্বস্বত্ব সংরক্ষিত", "All rights reserved")}
      </div>
    </footer>
  );
}
