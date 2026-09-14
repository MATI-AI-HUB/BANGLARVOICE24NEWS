const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
  const content = fs.readFileSync(path.join(__dirname, 'frontend', '.env.local'), 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

// Bengali news corpus — variety of categories + timestamps
const news = [
  // রাজনীতি
  { cat: 'রাজনীতি', hrs: 1, title: 'জাতীয় সংসদে বাজেট অধিবেশন শুরু', body: 'আগামী অর্থবছরের বাজেট নিয়ে সংসদে আলোচনা শুরু হয়েছে।' },
  { cat: 'রাজনীতি', hrs: 3, title: 'নির্বাচন কমিশন নতুন ভোটার তালিকা প্রকাশ', body: 'সারা দেশে নতুন ভোটার তালিকা প্রকাশিত হয়েছে।' },
  { cat: 'রাজনীতি', hrs: 5, title: 'পররাষ্ট্রমন্ত্রীর সাথে ভারতীয় প্রতিনিধি দলের বৈঠক', body: 'দ্বিপাক্ষিক সম্পর্ক নিয়ে গুরুত্বপূর্ণ আলোচনা হয়েছে।' },

  // অর্থনীতি
  { cat: 'অর্থনীতি', hrs: 2, title: 'রিজার্ভ বেড়ে ২৮ বিলিয়ন ডলার', body: 'বাংলাদেশ ব্যাংক জানিয়েছে, রিজার্ভ বৃদ্ধি অব্যাহত রয়েছে।' },
  { cat: 'অর্থনীতি', hrs: 4, title: 'পুঁজিবাজারে সূচকের রেকর্ড উত্থান', body: 'ঢাকা স্টক এক্সচেঞ্জে সূচক সর্বকালের সর্বোচ্চে পৌঁছেছে।' },
  { cat: 'অর্থনীতি', hrs: 8, title: 'রেমিট্যান্স প্রবাহে নতুন রেকর্ড', body: 'গত মাসে রেমিট্যান্স এসেছে ২.২ বিলিয়ন ডলার।' },

  // আন্তর্জাতিক
  { cat: 'আন্তর্জাতিক', hrs: 3, title: 'জাতিসংঘে বাংলাদেশের প্রস্তাব গৃহীত', body: 'জলবায়ু পরিবর্তন মোকাবেলায় বাংলাদেশের প্রস্তাব সর্বসম্মতভাবে গৃহীত।' },
  { cat: 'আন্তর্জাতিক', hrs: 6, title: 'মধ্যপ্রাচ্যে শান্তি আলোচনা শুরু', body: 'আন্তর্জাতিক সম্প্রদায়ের মধ্যস্থতায় আলোচনা শুরু হয়েছে।' },

  // খেলা
  { cat: 'খেলা', hrs: 1, title: 'টাইগারদের বিশ্বকাপ প্রস্তুতি শুরু', body: 'আগামী বিশ্বকাপকে সামনে রেখে অনুশীলন শুরু করেছে বাংলাদেশ দল।' },
  { cat: 'খেলা', hrs: 7, title: 'এশিয়ান গেমসে বাংলাদেশের স্বর্ণপদক', body: 'শুটিং ইভেন্টে স্বর্ণপদক জিতেছেন বাংলাদেশের অ্যাথলেট।' },
  { cat: 'খেলা', hrs: 12, title: 'ফুটবল লিগে মোহামেডানের জয়', body: 'প্রিমিয়ার লিগে মোহামেডান ৩-১ গোলে জিতেছে।' },

  // শিক্ষা
  { cat: 'শিক্ষা', hrs: 5, title: 'এসএসসি পরীক্ষার ফল প্রকাশ', body: 'আজ বিকেলে ফলাফল প্রকাশ করা হবে।' },
  { cat: 'শিক্ষা', hrs: 9, title: 'বিশ্ববিদ্যালয়ে নতুন ভর্তি নীতিমালা', body: 'একক ভর্তি পরীক্ষার নীতিমালা চূড়ান্ত হয়েছে।' },

  // স্বাস্থ্য
  { cat: 'স্বাস্থ্য', hrs: 2, title: 'ডেঙ্গু পরিস্থিতি স্বাভাবিক হচ্ছে', body: 'স্বাস্থ্য অধিদপ্তর জানিয়েছে, সংক্রমণ হার কমছে।' },
  { cat: 'স্বাস্থ্য', hrs: 10, title: 'নতুন টিকা কার্যক্রম শুরু', body: 'সারা দেশে শিশুদের জন্য নতুন টিকা কার্যক্রম শুরু হয়েছে।' },

  // বিনোদন
  { cat: 'বিনোদন', hrs: 4, title: 'বাংলাদেশি সিনেমা আন্তর্জাতিক পুরস্কার জিতল', body: 'ভারতের আন্তর্জাতিক চলচ্চিত্র উৎসবে বাংলাদেশি সিনেমা পুরস্কৃত হয়েছে।' },
  { cat: 'বিনোদন', hrs: 8, title: 'নতুন বাংলা অ্যালবাম প্রকাশ', body: 'জনপ্রিয় শিল্পীর নতুন অ্যালবাম প্রকাশিত হয়েছে।' },

  // প্রযুক্তি
  { cat: 'প্রযুক্তি', hrs: 3, title: 'দেশে নতুন সাবমেরিন কেবল সংযোগ', body: 'ইন্টারনেট গতি বাড়াতে নতুন সাবমেরিন কেবল চালু হয়েছে।' },
  { cat: 'প্রযুক্তি', hrs: 11, title: 'সরকারি ডিজিটাল প্ল্যাটফর্ম উদ্বোধন', body: 'নাগরিক সেবা সহজ করতে নতুন প্ল্যাটফর্ম চালু হয়েছে।' },
];

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let inserted = 0;
  for (const n of news) {
    const publishedAt = new Date(Date.now() - n.hrs * 3600 * 1000);
    await client.query(
      `INSERT INTO public.articles (title_bn, content_bn, category, status, published_at)
       VALUES ($1, $2, $3, 'published', $4)`,
      [n.title, n.body, n.cat, publishedAt.toISOString()],
    );
    inserted++;
  }
  console.log(`✅ Inserted ${inserted} articles`);

  const { rows } = await client.query(`
    SELECT category, COUNT(*) as count
    FROM public.articles
    WHERE status = 'published'
    GROUP BY category
    ORDER BY count DESC
  `);
  console.log('\n📊 Category breakdown:');
  rows.forEach(r => console.log(`   ${r.category}: ${r.count}`));

  const total = await client.query(`SELECT count(*) FROM public.articles WHERE status='published'`);
  console.log(`\n🎉 Total published: ${total.rows[0].count}`);

  await client.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
