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
  title: 'কপিরাইট নীতি',
  description:
    'বাংলার ভয়েসের কপিরাইট নীতি — নকলবিরোধী (Anti-plagiarism), কপিরাইট আইন ২০০০-এর ধারা ৩৬ ও ৭২ (Fair Use), DMCA ৪৮-ঘণ্টা অপসারণ অঙ্গীকার।',
};

export const dynamic = 'force-static';

export default function CopyrightPage() {
  return (
    <LegalArticle>
      <LegalDateAnchor />
      <LegalH1>কপিরাইট নীতি — Copyright &amp; DMCA</LegalH1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400">মেধাস্বত্ব সুরক্ষা, ন্যায্য ব্যবহার ও অপসারণ পদ্ধতি।</p>

      <LegalSummaryBox title="সারসংক্ষেপ (Bangla Summary)" tone="copyright">
        <p>
          বাংলার ভয়েস নকল (plagiarism) করে না এবং অন্যের কনটেন্ট যথাযথ উৎস-স্বীকৃতি ছাড়া ব্যবহার করে
          না। কপিরাইট আইন ২০০০-এর ধারা ৩৬ ও ৭২-এর ন্যায্য ব্যবহার (Fair Use) আমরা সম্মান করি। আপনার
          কপিরাইটকৃত কাজ আমাদের সাইটে থাকলে অভিযোগ পাঠান — DMCA অনুযায়ী ৪৮ ঘণ্টার মধ্যে অপসারণ করা
          হবে।
        </p>
      </LegalSummaryBox>

      <LegalSection id="ownership" title="১. মালিকানা (Ownership)">
        <LegalParagraph>
          বাংলার ভয়েসের নিজস্ব কনটেন্ট, লোগো, গ্রাফিক, UI/UX ডিজাইন ও সোর্স কোডের মেধাস্বত্ব বাংলার
          ভয়েস বা যথাযথ লাইসেন্সধারীর। অনুমতি ছাড়া বাণিজ্যিক পুনঃপ্রকাশ নিষিদ্ধ।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="anti-plagiarism" title="২. নকলবিরোধী নীতি (Anti-Plagiarism)">
        <LegalParagraph>আমাদের সম্পাদকীয় নীতি:</LegalParagraph>
        <LegalList
          items={[
            <>অন্য মাধ্যমের সংবাদ আমরা ‘সংবাদ সংস্থা/মাধ্যম সূত্র’ উল্লেখ করে ব্যবহার করি — কখনো নিজের নামে নকল করি না।</>,
            <>ভাষান্তর (translation)-এ মূল উৎসের স্বীকৃতি থাকে।</>,
            <>সংবাদ সংস্থার (বাসস, AP, Reuters ইত্যাদি) কনটেন্ট তাদের লাইসেন্স অনুযায়ী।</>,
            <>চিত্র/ভিডিও/ছবিতে যথাযথ ক্রেডিট ও alt-text থাকে।</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="fair-use" title="৩. ন্যায্য ব্যবহার — কপিরাইট আইন ২০০০, ধারা ৩৬ ও ৭২">
        <LegalParagraph>
          সমালোচনা, পর্যালোচনা, সংবাদ প্রতিবেদন ও শিক্ষামূলক উদ্দেশ্যে স্বল্পাংশ উদ্ধৃতি (quote) ন্যায্য
          ব্যবহার হিসেবে সুরক্ষিত — কপিরাইট আইন ২০০০ (সংশোধিত)-এর <strong>ধারা ৩৬</strong> (ন্যায্য
          ব্যবহার) ও <strong>ধারা ৭২</strong> (সাহিত্যকর্মের ন্যায্য ব্যবহার) অনুযায়ী। আমরা সর্বদা:
        </LegalParagraph>
        <LegalList
          items={[
            <>উৎস ও লেখকের নাম উল্লেখ করি।</>,
            <>সীমিত অংশ ব্যবহার করি — পুরো কাজ নয়।</>,
            <>মূল কাজের বাজার-মূল্য ক্ষতিগ্রস্ত করি না।</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="dmca" title="৪. DMCA অপসারণ পদ্ধতি (৪৮-ঘণ্টা SLA)">
        <LegalParagraph>
          আপনি যদি মনে করেন আপনার কপিরাইটকৃত কাজ আমাদের সাইটে অননুমোদিতভাবে আছে, অভিযোগ পাঠান
          নিম্নোক্ত তথ্যসহ:
        </LegalParagraph>
        <LegalList
          items={[
            <>কাজের বর্ণনা ও অরিজিনাল কপির লিংক/অবস্থান।</>,
            <>আমাদের সাইটে সেই কাজের সঠিক URL।</>,
            <>আপনার পূর্ণ নাম, ইমেইল ও কর্তৃত্বের ঘোষণা।</>,
          ]}
        />
        <LegalParagraph>
          অভিযোগ পাঠান: <LegalEmailLink /> — বিষয়: <strong>“DMCA Takedown”</strong>। আমরা{' '}
          <strong>৪৮ ঘণ্টার মধ্যে</strong> বিষয়বস্তু পরীক্ষা করে অবৈধ কনটেন্ট অপসারণ করব এবং সংশ্লিষ্ট
          পক্ষকে জানাব। জাল/দুর্বৃত্ত অভিযোগ করলে আপনি আইনত দায়ী হতে পারেন (DMCA 512(f))।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="contact" title="৫. যোগাযোগ">
        <LegalParagraph>
          কপিরাইট লাইসেন্সিং বা অপসারণ: <LegalEmailLink /> · বিষয়: “Copyright” বা “DMCA Takedown”।
        </LegalParagraph>
      </LegalSection>

      <p className="mt-10 border-t border-border/70 pt-4 text-xs text-neutral-500 dark:text-neutral-400">
        © ২০২৬ বাংলার ভয়েস · যোগাযোগ: <LegalEmailLink />
      </p>
    </LegalArticle>
  );
}
