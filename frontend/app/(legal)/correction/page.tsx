import type { Metadata } from 'next';
import {
  LegalArticle,
  LegalDateAnchor,
  LegalEmailLink,
  LegalH1,
  LegalList,
  LegalParagraph,
  LegalSection,
  LegalSummaryBox,
} from '../legal';

export const metadata: Metadata = {
  title: 'সংশোধন নীতি',
  description:
    'বাংলার ভয়েসের সংশোধন নীতি — Correction Notice বিন্যাস, ৬-ঘণ্টা ট্রায়েজ, ২৪-ঘণ্টা নিষ্পত্তি ও প্রেস কাউন্সিল নীতিমালা।',
};

export const dynamic = 'force-static';

export default function CorrectionPage() {
  return (
    <LegalArticle>
      <LegalDateAnchor />
      <LegalH1>সংশোধন নীতি — Corrections Policy</LegalH1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400">ভুল স্বীকার, সংশোধন ও স্বচ্ছতার প্রতিশ্রুতি।</p>

      <LegalSummaryBox title="সারসংক্ষেপ (Bangla Summary)" tone="correction">
        <p>
          কোনো ভুল প্রকাশ পেলে আমরা ৬ ঘণ্টার মধ্যে তা ট্রায়েজ করি এবং ২৪ ঘণ্টার মধ্যে সংশোধন/প্রত্যাহার
          করি। সংশোধিত তথ্য মূল আর্টিকেলের উপরে Correction Notice হিসেবে দেখানো হয়। বাংলাদেশ প্রেস
          কাউন্সিলের নীতিমালা আমাদের পথপ্রদর্শক।
        </p>
      </LegalSummaryBox>

      <LegalSection id="commitment" title="১. সংশোধনের অঙ্গীকার">
        <LegalParagraph>
          নির্ভুলতা সাংবাদিকতার প্রাণ। কোনো প্রতিবেদনে ভুল, অসম্পূর্ণতা বা বিভ্রান্তিকর তথ্য থাকলে — তা
          AI-সহায়ক বা মানবসৃষ্ট — আমরা তা প্রকাশ্যে সংশোধন করব। ভুল লুকানো আমাদের নীতি নয়।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="triage" title="২. ট্রায়েজ ও নিষ্পত্তির সময়সীমা">
        <LegalList
          items={[
            <><strong>৬ ঘণ্টা ট্রায়েজ:</strong> অভিযোগ/ভুল পাওয়ার ৬ ঘণ্টার মধ্যে গুরুত্ব ও সত্যতা যাচাই।</>,
            <><strong>২৪ ঘণ্টা নিষ্পত্তি:</strong> ছোট ভুল ২৪ ঘণ্টায় সংশোধন; বড় ভুলে প্রকাশ্য Correction Notice + প্রয়োজনে প্রত্যাহার।</>,
            <><strong>জরুরি ক্ষেত্রে (মানহানি/ক্ষতিকর):</strong> যত দ্রুত সম্ভব, ২৪ ঘণ্টার আগেই।</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="format" title="৩. Correction Notice-এর বিন্যাস">
        <div className="rounded-xl border-2 border-blue-600 bg-blue-50 p-4 dark:border-blue-500 dark:bg-blue-950/40">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
            CORRECTION NOTICE [তারিখ]
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-blue-900 dark:text-blue-100">
            “<em>শিরোনাম</em>”-এ প্রকাশিত ভুল তথ্যের জন্য আমরা দুঃখিত। মূল ভুলটি ছিল: … । সংশোধিত তথ্য: … ।
            ভুলটি চিহ্নিত করতে সাহায্যের জন্য [ব্যবহারকারী/উৎস]-কে ধন্যবাদ। — সম্পাদকীয় বোর্ড, বাংলার ভয়েস
          </p>
        </div>
        <p className="mt-3">
          এই নোটিশ সংশোধিত আর্টিকেলের একদম উপরে যুক্ত থাকে এবং অন্তত ৭ দিন দৃশ্যমান থাকে।
        </p>
      </LegalSection>

      <LegalSection id="report" title="৪. কীভাবে ভুল জানাবেন">
        <LegalParagraph>
          কোনো ভুল চোখে পড়লে <LegalEmailLink />-এ পাঠান, বিষয়: <strong>“Correction”</strong> —
          নিম্নোক্তসহ:
        </LegalParagraph>
        <LegalList
          items={[
            <>আর্টিকেলের URL/শিরোনাম।</>,
            <>কোন অংশটি ভুল ও সঠিক তথ্যটি কী (উৎসসহ)।</>,
            <>আপনার নাম ও যোগাযোগ (ঐচ্ছিক, তবে উত্তরের জন্য দরকারি)।</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="escalation" title="৫. প্রেস কাউন্সিলে আপিল">
        <LegalParagraph>
          আমাদের উত্তরে সন্তুষ্ট না হলে আপনি বাংলাদেশ প্রেস কাউন্সিলে অভিযোগ করতে পারেন। আমরা প্রেস
          কাউন্সিলের যেকোনো নির্দেশ মেনে চলব।
        </LegalParagraph>
      </LegalSection>

      <p className="mt-10 border-t border-border/70 pt-4 text-xs text-neutral-500 dark:text-neutral-400">
        © ২০২৬ বাংলার ভয়েস · সংশোধন অনুরোধ: <LegalEmailLink />
      </p>
    </LegalArticle>
  );
}
