import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'বাংলার ভয়েস — স্বাধীন সংবাদ প্রচারে নির্ভীক',
  description: 'বাংলার ভয়েস — স্বাধীন সংবাদ প্রচারে নির্ভীক',
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="container mx-auto px-4 py-8 text-center">
        {/* প্রধান বড় শিরোনাম: বাংলার ভয়েস */}
        <h1 className="text-4xl md:text-6xl font-black text-red-600 dark:text-red-500 tracking-tight mb-3">
          • বাংলার ভয়েস
        </h1>
        
        {/* সাব-হেডার: স্বাধীন সংবাদ প্রচারে নির্ভীক */}
        <h2 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 tracking-wide mb-2">
          স্বাধীন সংবাদ প্রচারে নির্ভীক
        </h2>
        
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
          বাংলাদেশ ও বিশ্ব — নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য সাংবাদিকতা
        </p>
      </section>
    </main>
  );
}
