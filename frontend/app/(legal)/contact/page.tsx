import type { Metadata } from 'next';
import { LegalArticle, LegalDateAnchor, LegalEmailLink, LegalH1, LegalList, LegalParagraph, LegalSection, LegalSummaryBox } from '../legal';

export const metadata: Metadata = {
  title: 'যোগাযোগ',
  description:
    'বাংলার ভয়েসের সাথে যোগাযোগ — নিউজ টিপ, বিজ্ঞাপন, আইনি/DMCA অনুসন্ধান। একমাত্র ইমেইল: banglarvoice24news@gmail.com',
};

export const dynamic = 'force-static';

export default function ContactPage() {
  return (
    <LegalArticle>
      <LegalDateAnchor />
      <LegalH1>যোগাযোগ — Contact</LegalH1>

      <LegalSummaryBox title="যোগাযোগের মাধ্যম (Bangla Summary)" tone="default">
        <p>
          সব ধরনের যোগাযোগের একমাত্র ইমেইল:{' '}
          <strong>banglarvoice24news@gmail.com</strong>। সংবাদ টিপ, বিজ্ঞাপন, কপিরাইট/DMCA, সংশোধন ও
          গোপনীয়তা সংক্রান্ত অনুরোধ — সব এই এক ঠিকানায়। ইমেইলের সাবজেক্টে বিষয় উল্লেখ করলে দ্রুত
          নিষ্পত্তি হয়।
        </p>
      </LegalSummaryBox>

      <LegalSection id="email" title="ইমেইল">
        <LegalParagraph>
          <LegalEmailLink />
        </LegalParagraph>
        <LegalParagraph>বিষয় অনুযায়ী সাবজেক্ট লাইন:</LegalParagraph>
        <LegalList
          items={[
            <>নিউজ টিপ: “News Tip”</>,
            <>বিজ্ঞাপন: “Advertising”</>,
            <>কপিরাইট অপসারণ: “DMCA Takedown”</>,
            <>সংশোধন: “Correction”</>,
            <>গোপনীয়তা/ডেটা মুছুন: “Privacy” বা “Data Deletion Request”</>,
            <>সাধারণ অনুসন্ধান: “General”</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="response-time" title="উত্তরের সময়সীমা">
        <LegalParagraph>
          সাধারণ অনুসন্ধানে ২৪-৪৮ ঘণ্টায় উত্তর। DMCA ও সংশোধন অনুরোধে দ্রুততর ব্যবস্থা (যথাক্রমে ৪৮
          ও ২৪ ঘণ্টা) — সংশ্লিষ্ট নীতিতে বিস্তারিত।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="office" title="অবস্থান">
        <LegalParagraph>
          ডিজিটাল প্ল্যাটফর্ম হিসেবে আমাদের কার্যক্রম অনলাইন; সাংগঠনিক ও আইনি এখতিয়ার ঢাকা,
          বাংলাদেশ।
        </LegalParagraph>
      </LegalSection>

      <p className="mt-10 border-t border-border/70 pt-4 text-xs text-neutral-500 dark:text-neutral-400">
        © ২০২৬ বাংলার ভয়েস · যোগাযোগ: <LegalEmailLink />
      </p>
    </LegalArticle>
  );
}
