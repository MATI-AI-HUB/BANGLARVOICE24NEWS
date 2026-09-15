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
  LEGAL_EMAIL,
} from '../legal';

export const metadata: Metadata = {
  title: 'গোপনীয়তা নীতি',
  description:
    'বাংলার ভয়েসের গোপনীয়তা নীতি — GDPR, বাংলাদেশ সাইবার নিরাপত্তা আইন ২০২৩ ও Data Protection Bill ২০২৬-এর সাথে সম্মতি। আমরা কখনো আপনার ডেটা বিক্রি করি না।',
};

export const dynamic = 'force-static';

export default function PrivacyPage() {
  return (
    <LegalArticle>
      <LegalDateAnchor />
      <LegalH1>গোপনীয়তা নীতি — Privacy Policy</LegalH1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400">
        Banglar Voice · বাংলাদেশ ও বিশ্বের নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য সংবাদ
      </p>

      <LegalSummaryBox title="সারসংক্ষেপ (Bangla Summary)" tone="privacy">
        <p>
          আমরা আপনার ব্যক্তিগত তথ্য <strong>কখনো বিক্রি করি না</strong>। আমাদের ওয়েবসাইট ও অ্যাপ
          ভার্সেল (Vercel) ও সুপাবেজ (Supabase)-এ চলে; বিজ্ঞাপনের জন্য Google AdSense ব্যবহার করি।
          ডেটা মুছে ফেলার অনুরোধ ৩০ দিনের মধ্যে সম্পন্ন করা হয় —{' '}
          <LegalEmailLink />-এ ইমেইল করুন। বাংলাদেশের সাইবার নিরাপত্তা আইন ২০২৩, সাইবার নিরাপত্তা
          অধ্যাদেশ ২০২৫, প্রস্তাবিত Data Protection Bill ২০২৬ ও ইউরোপীয় GDPR-এর মূলনীতি আমরা মেনে চলি।
        </p>
      </LegalSummaryBox>

      <LegalSection id="scope" title="১. প্রযোজ্যতা (Scope)">
        <LegalParagraph>
          এই নীতি প্রযোজ্য যখন আপনি banglarvoice24news.com ওয়েবসাইট, বাংলার ভয়েস মোবাইল অ্যাপ (রিডার,
          অ্যাডমিন, রিপোর্টার, স্টুডিও, টিভি) ব্যবহার করেন, অথবা আমাদের সাথে ইমেইল/ফর্মে যোগাযোগ করেন।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="collect" title="২. আমরা কী তথ্য সংগ্রহ করি">
        <LegalParagraph>আপনার অভিজ্ঞতা উন্নত করতে আমরা ন্যূনতম তথ্য সংগ্রহ করি:</LegalParagraph>
        <LegalList
          items={[
            <>অ্যাকাউন্ট তথ্য: নাম ও ইমেইল — শুধু মন্তব্য, নিউজলেটার বা রিপোর্টার ফিচারে (আপনি তৈরি করলে)।</>,
            <>স্বয়ংক্রিয় তথ্য: পরিদর্শিত পেজ, আনুমানিক অবস্থান (শহর), ডিভাইসের ধরন, ব্রাউজার ভাষা — অ্যানালিটিক্সের জন্য।</>,
            <>কুকি-ভিত্তিক তথ্য: Google AdSense (DoubleClick) বিজ্ঞাপন ব্যক্তিগতকরণের জন্য — বিস্তারিত <a className="underline decoration-primary/40 underline-offset-4" href="/cookies">কুকি নীতি</a>-তে।</>,
          ]}
        />
        <LegalParagraph>
          সংবেদনশীল তথ্য (ধর্ম, রাজনৈতিক মত, স্বাস্থ্য) আমরা ইচ্ছাকৃতভাবে সংগ্রহ করি না। রিপোর্টাররা
          মাঠ-রিপোর্ট জমা দিলে তা সংবাদের অংশ হিসেবে প্রক্রিয়াজাত হয়; সেখানে সতর্কতা হিসেবে আমরা
          প্রকাশ-পূর্ব যাচাই করি।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="use" title="৩. তথ্য ব্যবহারের উদ্দেশ্য">
        <LegalList
          items={[
            <>সংবাদ পরিবেশন ও ব্যক্তিগতকরণ (আপনার আগ্রহ অনুযায়ী) — বৈধ স্বার্থ ভিত্তিতে।</>,
            <>বিজ্ঞাপন দেখানো ও বিজ্ঞাপন কার্যকারিতা মাপা — Google AdSense-এর মাধ্যমে, সম্মতি সাপেক্ষে।</>,
            <>নিরাপত্তা: স্প্যাম, অপব্যবহার ও সাইবার হামলা ঠেকানো — সাইবার নিরাপত্তা আইন ২০২৩-এর আওতায় আমাদের কর্তব্য।</>,
            <>আইনি বাধ্যবাধকতা পালন: আদালতের নির্দেশ বা সরকারি আইনি দাবি মানা (গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের ক্ষমতাপ্রাপ্ত সংস্থা)।</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="share" title="৪. কার সাথে তথ্য ভাগ করি (Data Sharing)">
        <LegalParagraph>আমরা নিম্নোক্ত প্রক্রিয়াকরণকারীদের (processors) কাছে সীমিত তথ্য পাঠাই — বিক্রি নয়, বরাদ্দ নয়:</LegalParagraph>
        <LegalList
          items={[
            <><strong>Vercel Inc.</strong> — ওয়েবসাইট হোস্টিং (যুক্তরাষ্ট্র/ইইউ অঞ্চল)।</>,
            <><strong>Supabase Inc.</strong> — ডেটাবেস, প্রমাণীকরণ ও রিয়েল-টাইম (যুক্তরাষ্ট্র)।</>,
            <><strong>Google LLC (AdSense/DoubleClick)</strong> — বিজ্ঞাপন পরিবেশন; আপনার সম্মতি ছাড়া ব্যক্তিগতকৃত বিজ্ঞাপন নয়।</>,
            <><strong>ইমেইল পরিষেবা</strong> — নিউজলেটার পাঠানোর জন্য (আপনি সাবস্ক্রাইব করলে)।</>,
          ]}
        />
        <LegalParagraph>
          আমরা কখনো আপনার তথ্য <strong>তৃতীয় পক্ষের কাছে বিক্রি করি না, ভাড়া দিই না, বা বাণিজ্যিক
          ডেটাব্রোকারকে দিই না</strong> — এটি আমাদের স্থায়ী নীতি (We Never Sell Data).
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="gdpr" title="৫. GDPR অধিকার (ইইউ/ইইএ দর্শক)">
        <LegalParagraph>আপনি ইউরোপীয় ইউনিয়ন/ইইএ-তে থাকলে GDPR-এর অধীনে আপনার অধিকার আছে:</LegalParagraph>
        <LegalList
          items={[
            <>অ্যাক্সেস: কী তথ্য রাখি তা জানার অনুরোধ।</>,
            <>সংশোধন: ভুল তথ্য ঠিক করানো।</>,
            <>মুছে ফেলা: ‘right to be forgotten’।</>,
            <>প্রক্রিয়াজাতকরণে আপত্তি / সীমাবদ্ধতা।</>,
            <>ডেটা পোর্টেবিলিটি: মেশিন-পাঠযোগ্য কপি।</>,
            <>সম্মতি প্রত্যাহার: যেকোনো সময়, কুকি ব্যানার বা ইমেইলে।</>,
          ]}
        />
        <LegalParagraph>
          যেকোনো অধিকার প্রয়োগে <LegalEmailLink />-এ লিখুন। আমরা ৩০ দিনের মধ্যে উত্তর দিই (GDPR
          Art. 12-এর সময়সীমা)।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="bangladesh-law" title="৬. বাংলাদেশের আইনগত কাঠামো">
        <LegalParagraph>
          বাংলাদেশে কার্যকর নিম্নোক্ত কাঠামোর সাথে আমরা সম্মত থাকি:
        </LegalParagraph>
        <LegalList
          items={[
            <><strong>ডিজিটাল নিরাপত্তা আইন ২০১৮</strong> — দায়িত্বশীল প্রকাশনার ক্ষেত্রে।</>,
            <><strong>সাইবার নিরাপত্তা আইন ২০২৩</strong> — সাইবার নিরাপত্তা ঘটনা প্রতিরোধে আমাদের কর্তব্য।</>,
            <><strong>সাইবার নিরাপত্তা অধ্যাদেশ ২০২৫ ও প্রস্তাবিত Data Protection Bill ২০২৬</strong> — ব্যক্তিগত তথ্য সুরক্ষার মূলনীতি (ন্যূনতমকরণ, উদ্দেশ্য-সীমাবদ্ধতা, জবাবদিহিতা)।</>,
            <><strong>তথ্য ও যোগাযোগ প্রযুক্তি আইন ২০০৬ (সংশোধিত)</strong> — অনলাইন কনটেন্টের ক্ষেত্রে প্রযোজ্য সীমা।</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="retention" title="৭. ডেটা সংরক্ষণ ও মুছে ফেলা (Retention & Deletion SLA)">
        <LegalParagraph>
          আমরা ডেটা যতক্ষণ প্রয়োজন ততক্ষণ রাখি। মুছে ফেলার অনুরোধের জন্য আমাদের অঙ্গীকার:
        </LegalParagraph>
        <LegalList
          items={[
            <>৩০ দিনের মধ্যে অ্যাকাউন্ট ও ব্যক্তিগত তথ্য স্থায়ীভাবে মুছে ফেলা (backup-সহ)।</>,
            <>মুছে ফেলার পর নিশ্চিতকরণ ইমেইল।</>,
            <>সংবাদের অংশ হিসেবে প্রকাশিত রিপোর্টার-জমা তথ্য মুছে ফেলা যায় না — তবে তা থেকে নাম/পরিচয় সরানোর ব্যবস্থা আছে (আইনি সীমার মধ্যে)।</>,
          ]}
        />
        <LegalParagraph>
          মুছে ফেলার অনুরোধ: বিষয় ‘Data Deletion Request’ লিখে <LegalEmailLink />-এ পাঠান।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="security" title="৮. নিরাপত্তা (Security)">
        <LegalParagraph>
          TLS/HTTPS এনক্রিপশন, Supabase-এর RLS (Row Level Security), সর্বনিম্ন-অধিকার অ্যাক্সেস নীতি,
          এবং নিয়মিত ব্যাকআপ — এই ব্যবস্থাগুলো আমরা ব্যবহার করি। কোনো ডেটা-লঙ্ঘন ঘটলে আমরা
          প্রযোজ্য আইন অনুযায়ী ক্ষমতাপ্রাপ্ত সংস্থা ও ক্ষতিগ্রস্ত ব্যবহারকারীদের জানাব।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="children" title="৯. শিশুদের গোপনীয়তা">
        <LegalParagraph>
          আমাদের পরিষেবা ১৩ বছরের নিচের শিশুদের জন্য নয়। জেনেশুনে শিশুদের তথ্য সংগ্রহ করলে আমরা তা
          মুছে ফেলি।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="contact" title="১০. যোগাযোগ">
        <LegalParagraph>
          গোপনীয়তা সংক্রান্ত যেকোনো প্রশ্ন, অভিযোগ বা অনুরোধ:{' '}
          <LegalEmailLink /> · বিষয়: “Privacy”
        </LegalParagraph>
      </LegalSection>

      <p className="mt-10 border-t border-border/70 pt-4 text-xs text-neutral-500 dark:text-neutral-400">
        © ২০২৬ বাংলার ভয়েস · {LEGAL_EMAIL} · বাংলাদেশের আইন অনুসারে পরিচালিত।
      </p>
    </LegalArticle>
  );
}
