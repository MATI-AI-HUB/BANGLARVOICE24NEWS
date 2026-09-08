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
  title: 'দাবিত্যাগ',
  description:
    'বাংলার ভয়েসের দাবিত্যাগ — AI-সহায়ক কনটেন্ট, হ্যালুসিনেশন সতর্কতা, মানব-পর্যালোচনা (HITL), ২৪-ঘণ্টা সংশোধন অঙ্গীকার ও প্রেস কাউন্সিল নীতিমালা।',
};

export const dynamic = 'force-static';

export default function DisclaimerPage() {
  return (
    <LegalArticle>
      <LegalDateAnchor />
      <LegalH1>দাবিত্যাগ — Disclaimer</LegalH1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400">দায়িত্বশীল AI-সহায়ক সাংবাদিকতার স্বীকৃতি ও সীমা।</p>

      <LegalSummaryBox title="সারসংক্ষেপ (Bangla Summary)" tone="disclaimer">
        <p>
          বাংলার ভয়েস AI-সহায়ক প্রযুক্তি ব্যবহার করে সংবাদ তৈরি/সম্পাদনায় সাহায্য নেয়, কিন্তু সব
          প্রকাশ মানব সম্পাদকীয় পর্যালোচনার (Human-in-the-loop) পর হয়। AI ভুল তথ্য
          (হ্যালুসিনেশন) দিতে পারে — এমন ভুল অনিচ্ছাকৃত এবং প্রেস কাউন্সিলের নীতিমালা অনুযায়ী ২৪
          ঘণ্টার মধ্যে সংশোধন করা হয়। এই দাবিত্যাগ আইনত বাধ্যতামূলক দায় এড়ানোর মাধ্যম নয়।
        </p>
      </LegalSummaryBox>

      {/* CRITICAL: AI Hallucination notice — red box */}
      <div
        role="alert"
        className="mb-8 rounded-xl border-2 border-rose-600 bg-rose-50 p-5 dark:border-rose-500 dark:bg-rose-950/40"
      >
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-rose-700 dark:text-rose-300">
          ⚠️ AI হ্যালুসিনেশন সতর্কতা — পড়া বাধ্যতামূলক
        </h2>
        <p className="text-[15px] leading-relaxed text-rose-900 dark:text-rose-100">
          স্বয়ংক্রিয় (AI) পদ্ধতিতে তৈরি বা সারাংশীকৃত কনটেন্টে <strong>ভুল, কাল্পনিক বা সময়-অপ্রাসঙ্গিক
          তথ্য</strong> থাকতে পারে — একে AI হ্যালুসিনেশন বলে। দয়া করে গুরুত্বপূর্ণ তথ্য অন্য নির্ভরযোগ্য
          উৎস দিয়ে যাচাই করুন। কোনো ভুল পেলে নিচের ঠিকানায় জানান — আমরা প্রেস কাউন্সিল নীতিমালা
          অনুযায়ী <strong>২৪ ঘণ্টার মধ্যে</strong> সংশোধন/প্রত্যাহার করব।
        </p>
      </div>

      <LegalSection id="ai-assisted" title="১. AI-সহায়ক কনটেন্ট">
        <LegalParagraph>
          আমাদের কিছু সংবাদ, সারাংশ, ট্রান্সক্রিপশন ও ই-পেপার AI-মডেলের খসড়া থেকে আসে। প্রতিটি
          প্রকাশ প্রকাশের আগে মানব সম্পাদক/প্রতিবেদকের পর্যালোচনার (HITL) মধ্য দিয়ে যায়। AI সম্পূর্ণ
          স্বাধীনভাবে প্রকাশ করে না।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="accuracy" title="২. নির্ভুলতা ও ২৪-ঘণ্টা সংশোধন অঙ্গীকার">
        <LegalParagraph>ভুল হলে আমাদের প্রতিশ্রুতি:</LegalParagraph>
        <LegalList
          items={[
            <>অনিচ্ছাকৃত ভুল চিহ্নিত হলে ২৪ ঘণ্টার মধ্যে সংশোধন বা প্রত্যাহার।</>,
            <>গুরুতর ভুলে প্রকাশিত সংশোধন নোটিশ (Correction Notice) মূল আর্টিকেলে যুক্ত হয়।</>,
            <>প্রেস কাউন্সিলের নীতিমালা অনুযায়ী আপত্তি নিষ্পত্তি।</>,
          ]}
        />
        <LegalParagraph>
          ভুল রিপোর্ট করতে <LegalEmailLink /> — বিষয়: “Correction”। অথবা{' '}
          <a className="underline decoration-primary/40 underline-offset-4" href="/correction">সংশোধন নীতি</a> দেখুন।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="liability" title="৩. দায় (Liability — স্পষ্টকরণ)">
        <LegalParagraph>
          আমরা প্রচেষ্টা করি সংবাদ নির্ভুল ও নিরপেক্ষ রাখতে। তবে: (ক) সংবাদ/তথ্যের ব্যবহারে আপনার সিদ্ধান্তের
          দায় আপনার; (খ) ভুল অনিচ্ছাকৃত; (গ) বিনিয়োগ, চিকিৎসা বা আইনি সিদ্ধান্তের উৎস হিসেবে এই সাইট
          ব্যবহার করবেন না। <strong>এই দাবিত্যাগ কোনো আইনত বাধ্যতামূলক দায় (statutory obligations)
          সীমিত করে না</strong> — যেমন মানহানি আইন, প্রেস কাউন্সিলের আদেশ বা আদালতের নির্দেশ পালন।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="opinion" title="৪. মতামত ও বিশ্লেষণ">
        <LegalParagraph>
          ‘মতামত’, ‘বিশ্লেষণ’, ‘সম্পাদকীয়’ চিহ্নিত কনটেন্ট লেখকের ব্যক্তিগত মত — এটি সংবাদ নয়।
          অতিথি-কলামের মতের জন্য লেখক দায়ী।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="external" title="৫. বাহ্যিক লিংক ও বিজ্ঞাপন">
        <LegalParagraph>
          বাইরের লিংক, বিজ্ঞাপন ও স্পনসর্ড কনটেন্টের নির্ভুলতা/নিরাপত্তার জন্য আমরা দায়ী নই; তাদের
          নিজস্ব শর্ত প্রযোজ্য।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="contact" title="৬. যোগাযোগ">
        <LegalParagraph>
          আপত্তি/সংশোধন/অভিযোগ: <LegalEmailLink /> — বিষয়: “Complaint/Correction”।
          বাংলাদেশ প্রেস কাউন্সিলের নীতিমালা অনুসারে আমরা আপত্তি নিষ্পত্তিতে আগ্রহী।
        </LegalParagraph>
      </LegalSection>

      <p className="mt-10 border-t border-border/70 pt-4 text-xs text-neutral-500 dark:text-neutral-400">
        © ২০২৬ বাংলার ভয়েস · যোগাযোগ: <LegalEmailLink />
      </p>
    </LegalArticle>
  );
}
