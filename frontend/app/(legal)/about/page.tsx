import type { Metadata } from 'next';
import { LegalArticle, LegalDateAnchor, LegalEmailLink, LegalH1, LegalList, LegalParagraph, LegalSection, LegalSummaryBox } from '../legal';

export const metadata: Metadata = {
  title: 'আমাদের সম্পর্কে',
  description:
    'বাংলার ভয়েস — স্বাধীন, দায়িত্বশীল ও নির্ভরযোগ্য বাংলা সংবাদ প্ল্যাটফর্ম। সম্পাদকীয় মিশন, প্ল্যাটফর্ম পরিচয়, অবকাঠামো: Vercel ও Supabase।',
};

export const dynamic = 'force-static';

export default function AboutPage() {
  return (
    <LegalArticle>
      <LegalDateAnchor />
      <LegalH1>আমাদের সম্পর্কে — About Banglar Voice</LegalH1>

      <LegalSummaryBox title="এক নজরে (Bangla Summary)" tone="default">
        <p>
          <strong>বাংলার ভয়েস (Banglar Voice)</strong> — বাংলাদেশ ও বিশ্বের নিরপেক্ষ, দায়িত্বশীল ও
          নির্ভরযোগ্য সংবাদ প্ল্যাটফর্ম। ওয়েবসাইট, ৫টি মোবাইল অ্যাপ (রিডার, অ্যাডমিন, রিপোর্টার,
          স্টুডিও, টিভি) ও ই-পেপারের মাধ্যমে আমরা সংবাদ পৌঁছে দিই। অবকাঠামো: Vercel (ফ্রন্টএন্ড) +
          Supabase (ডেটাবেস/রিয়েল-টাইম)।
        </p>
      </LegalSummaryBox>

      <LegalSection id="mission" title="সম্পাদকীয় মিশন">
        <LegalParagraph>
          সত্যের সন্ধান, নিরপেক্ষ উপস্থাপন ও জনস্বার্থে সাংবাদিকতা — এই তিন স্তম্ভে আমাদের মিশন। আমরা
          AI-সহায়ক প্রযুক্তি ব্যবহার করি দক্ষতায়, কিন্তু চূড়ান্ত সম্পাদকীয় দায়িত্ব থাকে মানব
          সম্পাদকের হাতে। (দেখুন:{' '}
          <a className="underline decoration-primary/40 underline-offset-4" href="/disclaimer">দাবিত্যাগ</a> ও{' '}
          <a className="underline decoration-primary/40 underline-offset-4" href="/correction">সংশোধন নীতি</a>।)
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="platform" title="প্ল্যাটফর্ম পরিচয়">
        <LegalList
          items={[
            <><strong>ওয়েবসাইট:</strong> Next.js (App Router), Tailwind CSS — Vercel-এ হোস্টেড।</>,
            <><strong>মোবাইল অ্যাপ:</strong> Flutter — ৫টি অ্যাপ (রিডার, অ্যাডমিন, রিপোর্টার, স্টুডিও, টিভি)।</>,
            <><strong>ডেটা ও রিয়েল-টাইম:</strong> Supabase (PostgreSQL, RLS, Realtime, Storage)।</>,
            <><strong>ই-পেপার:</strong> স্বয়ংক্রিয় AI-চালিত দৈনিক ই-পেপার ইঞ্জিন।</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="contact" title="যোগাযোগ">
        <LegalParagraph>
          যেকোনো প্রয়োজনে (নিউজ টিপ, অংশীদারিত্ব, আইনি অনুসন্ধান): <LegalEmailLink />
        </LegalParagraph>
      </LegalSection>

      <p className="mt-10 border-t border-border/70 pt-4 text-xs text-neutral-500 dark:text-neutral-400">
        © ২০২৬ বাংলার ভয়েস · যোগাযোগ: <LegalEmailLink />
      </p>
    </LegalArticle>
  );
}
