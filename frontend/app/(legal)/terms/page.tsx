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
  title: 'ব্যবহারের শর্তাবলি',
  description:
    'বাংলার ভয়েস প্ল্যাটফর্ম ব্যবহারের শর্তাবলি — গ্রহণযোগ্য ব্যবহার, স্ক্র্যাপিং নিষেধ, প্রম্পট ইনজেকশন নিষেধ, সালিশ ও প্রযোজ্য আইন (ঢাকা, বাংলাদেশ)।',
};

export const dynamic = 'force-static';

export default function TermsPage() {
  return (
    <LegalArticle>
      <LegalDateAnchor />
      <LegalH1>ব্যবহারের শর্তাবলি — Terms of Use</LegalH1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400">Banglar Voice প্ল্যাটফর্ম ব্যবহারের পূর্বে মনোযোগ দিয়ে পড়ুন।</p>

      <LegalSummaryBox title="সারসংক্ষেপ (Bangla Summary)" tone="terms">
        <p>
          এই সাইট ব্যবহার করে আপনি নিচের শর্তে সম্মত হচ্ছেন। সংবাদ সামগ্রী ব্যক্তিগত পড়ার জন্য;
          বাণিজ্যিক স্ক্র্যাপিং, অটোমেটেড কনটেন্ট আহরণ ও AI প্রম্পট ইনজেকশন নিষিদ্ধ। বিরোধ নিষ্পত্তির
          এখতিয়ার ঢাকা, বাংলাদেশের আদালত।
        </p>
      </LegalSummaryBox>

      <LegalSection id="acceptance" title="১. সম্মতি (Acceptance)">
        <LegalParagraph>
          banglarvoice.com ও বাংলার ভয়েস অ্যাপ ব্যবহার করলে আপনি এই শর্তাবলিতে আবদ্ধ হচ্ছেন। আপনি
          অপ্রাপ্তবয়স্ক হলে অভিভাবকের সম্মতিতে ব্যবহার করুন।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="acceptable-use" title="২. গ্রহণযোগ্য ব্যবহার (Acceptable Use)">
        <LegalParagraph>আপনি সম্মত হচ্ছেন যে আপনি:</LegalParagraph>
        <LegalList
          items={[
            <>সংবাদ ব্যক্তিগত, অ-বাণিজ্যিক উদ্দেশ্যে পড়বেন।</>,
            <>অন্য ব্যবহারকারী বা সাংবাদিকদের প্রতি শ্রদ্ধাশীল ভাষা ব্যবহার করবেন; ঘৃণাবাচক/হুমকিমূলক মন্তব্য নয়।</>,
            <>প্ল্যাটফর্মের নিরাপত্তা বা কার্যকারিতা ক্ষতিগ্রস্ত করবেন না।</>,
            <>অবৈধ কার্যকলাপে (মানি লন্ডারিং, জালিয়াতি, সন্ত্রাসে উস্কানি) সাইট ব্যবহার করবেন না।</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="no-scraping" title="৩. স্ক্র্যাপিং ও অটোমেশন নিষেধ (No Scraping)">
        <LegalParagraph>
          আমাদের কনটেন্ট, ডেটাবেস বা API থেকে <strong>স্বয়ংক্রিয়ভাবে বাল্ক ডেটা আহরণ (scraping),
          crawling বা harvesting</strong> নিষিদ্ধ — সাংবাদিকতা/গবেষণার যুক্তিসঙ্গত সীমা ছাড়া, যেখানে
          লিখিত অনুমতি লাগবে। robots.txt-এর নির্দেশনা মানতে হবে। লঙ্ঘন করলে অ্যাক্সেস স্থগিত হতে পারে
          এবং সাইবার নিরাপত্তা আইন ২০২৩ অনুযায়ী আইনি ব্যবস্থা নেওয়া হতে পারে।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="no-injection" title="৪. প্রম্পট ইনজেকশন ও AI-নিরাপত্তা (No Prompt Injection)">
        <LegalParagraph>
          আমাদের প্ল্যাটফর্মে AI-সহায়ক ফিচার থাকতে পারে। আপনি সম্মত হচ্ছেন যে আপনি:
        </LegalParagraph>
        <LegalList
          items={[
            <>AI-কে গোপন নির্দেশ/সিস্টেম প্রম্পট বের করতে বাধ্য করবেন না (prompt injection)।</>,
            <>ফলাফল ম্যানিপুলেট বা মিথ্যা তথ্য ছড়াতে AI-কে ব্যবহার করবেন না।</>,
            <>AI-সিস্টেম, মডেল বা অবকাঠামোতে অননুমোদিত প্রবেশের চেষ্টা করবেন না।</>,
          ]}
        />
        <LegalParagraph>
          এই ধরনের আক্রমণ বাংলাদেশের সাইবার নিরাপত্তা আইন ২০২৩-এর অধীনে অপরাধ হতে পারে এবং আমরা আইনি
          প্রতিকার নিতে পারি।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="ip" title="৫. মেধাস্বত্ব (Intellectual Property)">
        <LegalParagraph>
          সাইটের সব কনটেন্ট, লোগো, গ্রাফিক, UI বাংলার ভয়েস বা যথাযথ লাইসেন্সধারীর সম্পত্তি। অনুমতি
          ছাড়া পুনঃপ্রকাশ নিষিদ্ধ — বিস্তারিত <a className="underline decoration-primary/40 underline-offset-4" href="/copyright">কপিরাইট নীতি</a>-তে।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="content" title="৬. ব্যবহারকারী-জমা কনটেন্ট (মন্তব্য ও রিপোর্ট)">
        <LegalParagraph>
          মন্তব্য ও মাঠ-রিপোর্ট জমা দিলে আপনি নিশ্চিত করছেন সেটি সত্য, আপনার নিজের এবং আইনত প্রকাশযোগ্য।
          আমরা অপমানজনক, মিথ্যা বা ক্ষতিকর কনটেন্ট মুছে ফেলার অধিকার রাখি। রিপোর্টারের জমা-রিপোর্ট
          সম্পাদকীয় যাচাইয়ের পর প্রকাশ পায়।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="ads" title="৭. বিজ্ঞাপন ও থার্ড-পার্টি লিংক">
        <LegalParagraph>
          Google AdSense-সহ বিজ্ঞাপন ও বাইরের লিংকের কনটেন্টের জন্য তৃতীয় পক্ষ দায়ী; তাদের নিজস্ব নীতি
          প্রযোজ্য। আমাদের <a className="underline decoration-primary/40 underline-offset-4" href="/cookies">কুকি নীতি</a> ও <a className="underline decoration-primary/40 underline-offset-4" href="/privacy">গোপনীয়তা নীতি</a> দেখুন।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="liability" title="৮. দায় সীমাবদ্ধতা (Liability)">
        <LegalParagraph>
          আমরা যথাসম্ভব নির্ভুল সংবাদ দেওয়ার চেষ্টা করি, কিন্তু প্রযুক্তিগত ত্রুটি, বিলম্ব বা AI-সহায়ক
          ভুলের জন্য প্রত্যক্ষ ক্ষতির বাইরে দায়ী নই। আইনত বাধ্যতামূলক দায় (statutory obligations)
          এই সীমাবদ্ধতা দ্বারা খর্ব হয় না — বিস্তারিত <a className="underline decoration-primary/40 underline-offset-4" href="/disclaimer">দাবিত্যাগ</a>-এ।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="governing" title="৯. প্রযোজ্য আইন ও এখতিয়ার (Governing Law)">
        <LegalParagraph>
          এই শর্তাবলি <strong>গণপ্রজাতন্ত্রী বাংলাদেশের আইন</strong> অনুসারে পরিচালিত ও ব্যাখ্যাত হবে।
          যেকোনো বিরোধ প্রথমে <LegalEmailLink />-এ লিখিতভাবে জানান; ২১ দিনের মধ্যে নিষ্পত্তি না হলে
          বিরোধের একচেটিয়া এখতিয়ার <strong>ঢাকা, বাংলাদেশের আদালত</strong>-এর।
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="changes" title="১০. পরিবর্তন">
        <LegalParagraph>
          শর্ত পরিবর্তন করলে এই পেজে হালনাগাদ তারিখ-সহ প্রকাশ করব। গুরুত্বপূর্ণ পরিবর্তনে ইমেইল/ব্যানারে
          জানাব। পরিবর্তনের পর ব্যবহার অব্যাহত রাখলে নতুন শর্তে সম্মতি ধরা হবে।
        </LegalParagraph>
      </LegalSection>

      <p className="mt-10 border-t border-border/70 pt-4 text-xs text-neutral-500 dark:text-neutral-400">
        © ২০২৬ বাংলার ভয়েস · যোগাযোগ: <LegalEmailLink />
      </p>
    </LegalArticle>
  );
}
