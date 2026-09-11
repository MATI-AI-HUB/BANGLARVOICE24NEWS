import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'বাংলার ভয়েস — স্বাধীন সংবাদ প্রচারে নির্ভীক',
  description: 'বাংলার ভয়েস — স্বাধীন সংবাদ প্রচারে নির্ভীক',
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper text-ink dark:bg-ink dark:text-paper">
      <section className="container mx-auto px-4 py-10 text-center">
        {/* বড় অক্ষরে "বাংলার ভয়েস" */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-red-600 tracking-tight mb-3">
          • বাংলার ভয়েস
        </h1>

        {/* ছোট অক্ষরে সঠিক বানানে "স্বাধীন সংবাদ প্রচারে নির্ভীক" */}
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          স্বাধীন সংবাদ প্রচারে নির্ভীক
        </h2>

        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          বাংলাদেশ ও বিশ্ব — নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য সাংবাদিকতা
        </p>
      </section>
    </main>
  );
}
