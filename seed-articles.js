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

const articles = [
  {
    title_bn: 'পদ্মা সেতু দিয়ে প্রথম দিনে ৫১ হাজার যান পারাপার, টোল আদায় ২ কোটি',
    content_bn: 'পদ্মা সেতু উদ্বোধনের প্রথম দিনে রেকর্ড সংখ্যক যানবাহন পারাপার হয়েছে। সেতু কর্তৃপক্ষ জানিয়েছে, টোল আদায় হয়েছে ২ কোটি টাকার বেশি। দক্ষিণাঞ্চলের ২১টি জেলার সাথে সরাসরি সড়ক সংযোগ স্থাপিত হওয়ায় অর্থনৈতিক কর্মকাণ্ডে নতুন গতি এসেছে।',
    category: 'জাতীয়',
    status: 'published',
  },
  {
    title_bn: 'ঢাকায় মেট্রোরেলের নতুন রুট উদ্বোধন আজ',
    content_bn: 'রাজধানীর যানজট কমাতে মেট্রোরেলের নতুন অংশ চালু হতে যাচ্ছে। এতে প্রতিদিন অতিরিক্ত দুই লাখ যাত্রী সেবা পাবেন।',
    category: 'নগর',
    status: 'published',
  },
  {
    title_bn: 'নির্বাচন কমিশনের নতুন নির্দেশনা প্রকাশ',
    content_bn: 'আগামী জাতীয় নির্বাচনকে সামনে রেখে ভোটার তালিকা হালনাগাদ ও কেন্দ্র পুনর্বিন্যাসের নির্দেশনা দিয়েছে নির্বাচন কমিশন।',
    category: 'রাজনীতি',
    status: 'published',
  },
  {
    title_bn: 'বিশ্ব বাজারে সোনার দাম নতুন রেকর্ড',
    content_bn: 'আন্তর্জাতিক বাজারে সোনার দাম নতুন রেকর্ড স্পর্শ করেছে। স্থানীয় বাজারেও ভরিতে প্রায় দুই হাজার টাকা বেড়েছে।',
    category: 'অর্থনীতি',
    status: 'published',
  },
  {
    title_bn: 'বাংলাদেশ ক্রিকেট দলের সিরিজ জয়',
    content_bn: 'ঘরের মাঠে টানা তৃতীয় সিরিজ জিতল বাংলাদেশ। শেষ ম্যাচে ৫ উইকেটের ব্যবধানে জয় পায় টাইগাররা।',
    category: 'খেলা',
    status: 'published',
  },
];

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('✅ Connected\n');

  for (const a of articles) {
    const { rowCount } = await client.query(
      `INSERT INTO public.articles (title_bn, content_bn, category, status, published_at)
       VALUES ($1, $2, $3, $4, now())`,
      [a.title_bn, a.content_bn, a.category, a.status],
    );
    console.log(`✅ ${a.title_bn.slice(0, 40)}...`);
  }

  const count = await client.query(`SELECT count(*) FROM public.articles`);
  console.log(`\n📊 Total articles: ${count.rows[0].count}`);

  await client.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
