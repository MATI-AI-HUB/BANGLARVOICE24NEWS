import type { Metadata } from 'next';
// AI Policy shares the same content as the Copyright page (editorial intent).
// Next.js supports default re-export of another route's page component while
// keeping a distinct /ai-policy route + metadata.
export { default } from '../copyright/page';

export const metadata: Metadata = {
  title: 'AI নীতি',
  description:
    'বাংলার ভয়েসের AI নীতি — AI-সহায়ক কনটেন্ট, মেধাস্বত্ব, ন্যায্য ব্যবহার (ধারা ৩৬ ও ৭২), DMCA ৪৮-ঘণ্টা অপসারণ অঙ্গীকার।',
};

export const dynamic = 'force-static';
