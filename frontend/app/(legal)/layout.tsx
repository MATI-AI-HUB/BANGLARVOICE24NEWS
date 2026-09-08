import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'আইনি তথ্য ও নীতিমালা — বাংলার ভয়েস',
    template: '%s — বাংলার ভয়েস',
  },
  description:
    'বাংলার ভয়েসের গোপনীয়তা নীতি, ব্যবহারের শর্তাবলি, কুকি নীতি, দাবিত্যাগ, কপিরাইট ও সংশোধন নীতি — বাংলাদেশ আইন ও GDPR মেনে।',
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
