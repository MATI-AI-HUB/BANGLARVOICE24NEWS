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
  title: 'কুকি নীতি',
  description:
    'বাংলার ভয়েসের কুকি নীতি — কুকি কী, Google DoubleClick/AdSense, সম্মতি ব্যবস্থাপনা (Consent Mode v2) এবং কীভাবে কুকি নিয়ন্ত্রণ করবেন।',
};

export const dynamic = 'force-static';

export default function CookiesPage() {
  return (
    <LegalArticle>
      <LegalDateAnchor />
      <LegalH1>কুকি নীতি — Cookie Policy</LegalH1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400">কীভাবে আমরা কুকি ব্যবহার করি ও আপনি কীভাবে নিয়ন্ত্রণ করেন।</p>

      <LegalSummaryBox title="সারসংক্ষেপ (Bangla Summary)" tone="cookies">
        <p>
          কুকি হলো ছোট ফাইল যা আপনার ব্রাউজার মনে রাখে। আমরা প্রয়োজনীয় কুকি (সাইট চালু রাখতে),
          অ্যানালিটিক্স (পেজভিউ মাপতে) ও Google AdSense/DoubleClick বিজ্ঞাপন কুকি ব্যবহার করি।
          ব্যক্তিগতকৃত বিজ্ঞাপন শুধু আপনার সম্মতিতে। কুকি ব্যানারে ‘গ্রহণ’/‘প্রত্যাখ্যান’ জানালে
          সেটাই চূড়ান্ত।
        </p>
      </LegalSummaryBox>

      <LegalSection id="what" title="১. কুকি কী (What are Cookies)">
        <LegalParagraph>
          কুকি হলো ছোট টেক্সট ফাইল যা আপনার ব্রাউজারে সংরক্ষিত হয় — সাইটের সেটিংস, লগইন অবস্থা বা
          আগ্রহ মনে রাখতে। কিছু কুকি সেশন-ভিত্তিক (ব্রাউজার বন্ধে মুছে যায়), কিছু স্থায়ী (আপনি মুছা
          পর্যন্ত)।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="types" title="২. আমরা কী ধরনের কুকি ব্যবহার করি">
        <LegalList
          items={[
            <><strong>প্রয়োজনীয় (Strictly Necessary):</strong> ‘bv_consent’ — আপনার সম্মতির পছন্দ মনে রাখে; বন্ধ করা যায় না।</>,
            <><strong>অ্যানালিটিক্স:</strong> Google Analytics (GA4) — কোন পেজ জনপ্রিয় তা বোঝার জন্য, সমষ্টিগত (anonymous)।</>,
            <><strong>বিজ্ঞাপন (AdSense/DoubleClick):</strong> আগ্রহ-ভিত্তিক বিজ্ঞাপন দেখাতে; শুধু সম্মতিতে।</>,
            <><strong>পছন্দ/ফাংশনাল:</strong> থিম (লাইট/ডার্ক), ভাষা, নিউজলেটার সাবস্ক্রিপশন স্টেট।</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="doubleclick" title="৩. Google AdSense ও DoubleClick">
        <LegalParagraph>
          আমরা Google AdSense ব্যবহার করি। AdSense/Google-এর DoubleClick কুকি আপনার ব্রাউজিং ইতিহাসের
          ভিত্তিতে আগ্রহ-অনুমান করে বিজ্ঞাপন দেখাতে পারে। এই ব্যক্তিগতকরণ <strong>শুধু তখনই সক্রিয়
          হয় যখন আপনি বিজ্ঞাপন-কুকিতে সম্মতি দেন</strong> (Consent Mode v2)। না দিলে শুধু
          অ-ব্যক্তিগতকৃত (contextual) বিজ্ঞাপন দেখবেন।
        </LegalParagraph>
        <LegalParagraph>
          Google-এর নিজস্ব বিজ্ঞাপন সেটিংস:{' '}
          <a className="underline decoration-primary/40 underline-offset-4" href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
            adssettings.google.com
          </a>
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="consent" title="৪. সম্মতি ব্যবস্থাপনা (Consent Management)">
        <LegalParagraph>
          প্রথম দর্শনে একটি কুকি ব্যানার দেখানো হয় (Google Consent Mode v2 অনুযায়ী):
        </LegalParagraph>
        <LegalList
          items={[
            <><strong>‘সব গ্রহণ’:</strong> ad_storage, analytics_storage, ad_user_data, ad_personalization = granted।</>,
            <><strong>‘প্রত্যাখ্যান’:</strong> সব = denied; শুধু প্রয়োজনীয় কুকি চলে।</>,
            <><strong>পুনরায় পরিবর্তন:</strong> যেকোনো সময় ফুটারের কুকি নীতি পেজ থেকে বা ব্রাউজার কুকি মুছে আবার পছন্দ সেট করুন।</>,
          ]}
        />
        <LegalParagraph>
          পছন্দ localStorage-এ ‘bv_consent’ হিসেবে সংরক্ষিত হয়; আপনি চাইলে ব্রাউজারের সেটিংস থেকেও
          যেকোনো কুকি মুছতে পারেন।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="manage" title="৫. কীভাবে কুকি নিয়ন্ত্রণ করবেন">
        <LegalParagraph>
          ব্রাউজার সেটিংসে (Chrome/Firefox/Safari) গিয়ে সব কুকি বা নির্দিষ্ট সাইটের কুকি মুছতে
          পারেন। মনে রাখবেন: সব কুকি মুছলে আপনার পছন্দ (থিম, লগইন) রিসেট হবে।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="contact" title="৬. যোগাযোগ">
        <LegalParagraph>
          কুকি সম্পর্কে প্রশ্ন থাকলে <LegalEmailLink />-এ লিখুন, বিষয়: “Cookies”।
        </LegalParagraph>
      </LegalSection>

      <p className="mt-10 border-t border-border/70 pt-4 text-xs text-neutral-500 dark:text-neutral-400">
        © ২০২৬ বাংলার ভয়েস · যোগাযোগ: <LegalEmailLink />
      </p>
    </LegalArticle>
  );
}
