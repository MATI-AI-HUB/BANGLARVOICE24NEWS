// Renders the day's e-paper edition to a vector PDF with headless Chromium and
// uploads it to the public `epaper-archives` Supabase Storage bucket.
// Runs in GitHub Actions (see .github/workflows/epaper-archive.yml).
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// Secrets live in Supabase Vault (api_vault -> vault.secrets). Only the two
// bootstrap credentials above come from the CI environment.
async function vaultSecret(serviceName) {
  const { data: row, error } = await supabase
    .from('api_vault')
    .select('key_encrypted')
    .eq('service_name', serviceName)
    .eq('environment', 'prod')
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(`Vault lookup failed for ${serviceName}: ${error.message}`);
  if (!row?.key_encrypted) return null;
  const { data: plain, error: decryptError } = await supabase.rpc('decrypt_vault_secret', {
    p_secret_id: row.key_encrypted,
  });
  if (decryptError) throw new Error(`Vault decrypt failed for ${serviceName}: ${decryptError.message}`);
  return plain || null;
}

const siteUrl = (
  (await vaultSecret('SITE_URL')) ||
  process.env.SITE_URL ||
  'https://www.banglarvoice24news.com'
).replace(/\/$/, '');
const dhakaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
const editionDate = process.env.EDITION_DATE || dhakaDate;
if (!/^\d{4}-\d{2}-\d{2}$/.test(editionDate)) {
  console.error('EDITION_DATE must be YYYY-MM-DD');
  process.exit(1);
}

const { data: edition, error } = await supabase
  .from('epaper_editions')
  .select('id, title')
  .eq('edition_date', editionDate)
  .maybeSingle();
if (error || !edition) {
  console.error(`No edition found for ${editionDate}`, error?.message ?? '');
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`${siteUrl}/api/public/epaper/${editionDate}/print`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ format: 'A3', printBackground: true, preferCSSPageSize: true });

  const path = `${editionDate}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('epaper-archives')
    .upload(path, pdf, { contentType: 'application/pdf', upsert: true, cacheControl: '31536000' });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from('epaper_editions')
    .update({ archive_path: path, archive_generated_at: new Date().toISOString() })
    .eq('id', edition.id);
  if (updateError) throw updateError;

  console.log(`Archived ${path} (${(pdf.length / 1024).toFixed(0)} KiB)`);
} finally {
  await browser.close();
}
