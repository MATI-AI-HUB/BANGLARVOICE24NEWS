import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error('TEST_DATABASE_URL is required for the disposable PostgreSQL schema test.');

const client = new Client({ connectionString });
const publicArticle = '00000000-0000-0000-0000-000000000010';
const draftArticle = '00000000-0000-0000-0000-000000000011';
const premiumArticle = '00000000-0000-0000-0000-000000000012';
const cascadeArticle = '00000000-0000-0000-0000-000000000013';
const editorId = '00000000-0000-0000-0000-000000000001';
const readerId = '00000000-0000-0000-0000-000000000002';
const premiumUserId = '00000000-0000-0000-0000-000000000003';

function pass(message) {
  console.log('PASS', message);
}

async function expectReject(fn, message, expectedCode) {
  try {
    await fn();
  } catch (error) {
    if (expectedCode && error.code !== expectedCode) {
      throw new Error(message + ': expected SQLSTATE ' + expectedCode + ', got ' + error.code + ': ' + error.message);
    }
    pass(message);
    return error;
  }
  throw new Error(message + ': expected the operation to be rejected');
}

async function setPrincipal(role, subject, ip) {
  await client.query('RESET ROLE');
  await client.query(
    "select set_config('request.jwt.claim.role', $1, false), set_config('request.jwt.claim.sub', $2, false), set_config('request.headers', $3, false)",
    [role, subject || '', JSON.stringify({ 'x-forwarded-for': ip })],
  );
  await client.query('SET ROLE ' + role);
}

async function insertComment(articleId, displayName, body) {
  const who = (await client.query('select current_user as u')).rows[0].u;
  await client.query(
    'insert into public.article_comments (article_id, display_name, body) values ($1, $2, $3)',
    [articleId, displayName, body],
  );
  await client.query('reset role');
  const row = await client.query(
    'select id, status, moderated_by, moderated_at from public.article_comments where article_id = $1 and display_name = $2 and body = $3 order by created_at desc limit 1',
    [articleId, displayName, body],
  );
  await client.query('set role ' + who);
  return row;
}

async function readModeration(id) {
  const who = (await client.query('select current_user as u')).rows[0].u;
  await client.query('reset role');
  const r = await client.query('select moderated_by, moderated_at from public.article_comments where id = $1', [id]);
  await client.query('set role ' + who);
  return r.rows[0];
}

const fixture = [
  'create role anon nologin;',
  'create role authenticated nologin;',
  'create role service_role nologin bypassrls;',
  'create schema auth;',
  'create schema private;',
  "create type public.app_role as enum ('staff_reporter', 'desk_editor', 'chief_editor', 'admin');",
  'create table auth.users (id uuid primary key);',
  'create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, role public.app_role not null);',
  'create table public.articles (id uuid primary key, slug text not null unique, title_bn text not null, status text not null, is_premium boolean not null default false);',
  "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;",
  "create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), ''); $$;",
  "create function public.current_app_role() returns public.app_role language sql stable security definer set search_path = '' as $$ select role from public.profiles where id = auth.uid(); $$;",
  "create function private.has_active_premium_subscription() returns boolean language sql stable security definer set search_path = '' as $$ select auth.uid() = '00000000-0000-0000-0000-000000000003'::uuid; $$;",
  'grant usage on schema public, auth, private to anon, authenticated, service_role;',
  'grant execute on function auth.uid(), auth.role(), public.current_app_role(), private.has_active_premium_subscription() to anon, authenticated, service_role;',
  'grant select on public.articles to anon, authenticated;',
  'alter table public.articles enable row level security;',
  "create policy articles_read_published_by_entitlement on public.articles for select to anon, authenticated using (status = 'published' and (is_premium = false or private.has_active_premium_subscription()));",
  "insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-000000000003');",
  "insert into public.profiles (id, role) values ('00000000-0000-0000-0000-000000000001', 'admin'), ('00000000-0000-0000-0000-000000000002', 'staff_reporter'), ('00000000-0000-0000-0000-000000000003', 'staff_reporter');",
  "insert into public.articles (id, slug, title_bn, status, is_premium) values ('00000000-0000-0000-0000-000000000010', 'public-article', 'Public article', 'published', false), ('00000000-0000-0000-0000-000000000011', 'draft-article', 'Draft article', 'draft', false), ('00000000-0000-0000-0000-000000000012', 'premium-article', 'Premium article', 'published', true), ('00000000-0000-0000-0000-000000000013', 'cascade-article', 'Cascade article', 'published', false);"
].join('\n');

try {
  await client.connect();
  await client.query(fixture);

  const migrationPath = resolve(process.cwd(), '../supabase/migrations/20261018212000_article_comments.sql');
  const migration = readFileSync(migrationPath, 'utf8');
  await client.query(migration);
  pass('migration applies to a fresh PostgreSQL 17 fixture');

  const rateLimitSchema = await client.query(
    "select column_name, data_type from information_schema.columns where table_schema = 'private' and table_name = 'article_comment_rate_limits'",
  );
  assert.ok(rateLimitSchema.rows.some((column) => column.column_name === 'client_key' && column.data_type === 'bigint'));
  assert.ok(!rateLimitSchema.rows.some((column) => column.column_name === 'client_ip'));
  pass('rate limiter persists a pseudonymous key rather than a raw IP address');

  await setPrincipal('anon', null, '203.0.113.10');
  const publicArticleResult = await client.query('select id from public.articles where id = $1', [publicArticle]);
  assert.equal(publicArticleResult.rowCount, 1);
  const first = await insertComment(publicArticle, 'News Reader', 'A valid comment');
  assert.equal(first.rows[0].status, 'pending');
  assert.equal(first.rows[0].moderated_by, null);
  assert.equal(first.rows[0].moderated_at, null);
  pass('anonymous public-article submissions are pending with no moderator metadata');

  const hiddenPending = await client.query('select id from public.article_comments where id = $1', [first.rows[0].id]);
  assert.equal(hiddenPending.rowCount, 0);
  pass('pending comments are not visible to anonymous readers');

  await expectReject(
    () => client.query("insert into public.article_comments (article_id, display_name, body, status) values ($1, 'Reader', 'Attempt to self-approve', 'approved')", [publicArticle]),
    'anonymous caller cannot set status=approved directly',
    '42501',
  );
  await expectReject(
    () => client.query(
      "insert into public.article_comments (article_id, display_name, body, moderated_by) values ($1, 'Reader', 'Attempt to spoof moderator', $2)",
      [publicArticle, readerId],
    ),
    'anonymous caller cannot set moderator identity directly',
    '42501',
  );

  await setPrincipal('anon', null, '');
  await expectReject(
    () => insertComment(publicArticle, 'Reader', 'Missing client IP'),
    'comment insertion fails closed when the trusted client IP is unavailable',
    'P0001',
  );
  await setPrincipal('anon', null, '203.0.113.10');

  const draftVisible = await client.query('select id from public.articles where id = $1', [draftArticle]);
  assert.equal(draftVisible.rowCount, 0);
  await expectReject(
    () => insertComment(draftArticle, 'Reader', 'Draft comment'),
    'anonymous caller cannot comment on a draft article',
    '42501',
  );

  const premiumVisible = await client.query('select id from public.articles where id = $1', [premiumArticle]);
  assert.equal(premiumVisible.rowCount, 0);
  await expectReject(
    () => insertComment(premiumArticle, 'Reader', 'Premium bypass attempt'),
    'anonymous caller cannot comment on a premium article without entitlement',
    '42501',
  );

  await expectReject(
    () => insertComment(publicArticle, 'Reader', 'x'.repeat(2001)),
    'database constraint rejects overlong comments',
    '23514',
  );
  await expectReject(
    () => insertComment(publicArticle, 'Bad\nName', 'valid comment'),
    'database constraint rejects control characters in names',
    '23514',
  );

  await setPrincipal('anon', null, '203.0.113.20');
  await insertComment(publicArticle, 'Reader One', 'Rate limit test one');
  await insertComment(publicArticle, 'Reader Two', 'Rate limit test two');
  await insertComment(publicArticle, 'Reader Three', 'Rate limit test three');
  await expectReject(
    () => insertComment(publicArticle, 'Reader Four', 'Rate limit test four'),
    'direct Supabase inserts cannot bypass the atomic 3-per-10-minute IP limit',
    'P0001',
  );

  const concurrentClients = await Promise.all(Array.from({ length: 5 }, async () => {
    const concurrentClient = new Client({ connectionString });
    await concurrentClient.connect();
    await concurrentClient.query(
      "select set_config('request.jwt.claim.role', $1, false), set_config('request.jwt.claim.sub', $2, false), set_config('request.headers', $3, false)",
      ['anon', '', JSON.stringify({ 'x-forwarded-for': '203.0.113.21' })],
    );
    await concurrentClient.query('SET ROLE anon');
    return concurrentClient;
  }));
  try {
    const concurrentResults = await Promise.all(concurrentClients.map((concurrentClient, index) =>
      concurrentClient.query(
        'insert into public.article_comments (article_id, display_name, body) values ($1, $2, $3)',
        [publicArticle, 'Concurrent ' + index, 'Concurrent rate limit test'],
      ).then(() => ({ ok: true }), (error) => ({ ok: false, error })),
    ));
    assert.equal(concurrentResults.filter((result) => result.ok).length, 3);
    assert.equal(concurrentResults.filter((result) => !result.ok && result.error.code === 'P0001').length, 2);
    pass('concurrent submissions are serialized by the database rate-limit lock');
  } finally {
    await Promise.all(concurrentClients.map((concurrentClient) => concurrentClient.end().catch(() => {})));
  }

  await expectReject(
    () => client.query('select client_key from private.article_comment_rate_limits limit 1'),
    'rate-limit records are not readable by anonymous clients',
    '42501',
  );

  await setPrincipal('authenticated', readerId, '203.0.113.30');
  const readerInsert = await insertComment(publicArticle, 'Signed-in Reader', 'A signed-in comment');
  const readerPendingVisible = await client.query('select id from public.article_comments where id = $1', [readerInsert.rows[0].id]);
  assert.equal(readerPendingVisible.rowCount, 0);
  const readerUpdate = await client.query("update public.article_comments set status = 'approved' where id = $1 returning id", [readerInsert.rows[0].id]);
  assert.equal(readerUpdate.rowCount, 0);
  const readerDelete = await client.query('delete from public.article_comments where id = $1 returning id', [readerInsert.rows[0].id]);
  assert.equal(readerDelete.rowCount, 0);
  pass('ordinary authenticated users cannot read, approve, or delete pending comments');

  await setPrincipal('authenticated', premiumUserId, '203.0.113.31');
  const premiumAllowed = await client.query('select id from public.articles where id = $1', [premiumArticle]);
  assert.equal(premiumAllowed.rowCount, 1);
  const premiumInsert = await insertComment(premiumArticle, 'Premium Reader', 'Entitled premium comment');
  assert.equal(premiumInsert.rows[0].status, 'pending');
  pass('premium-entitled authenticated users follow the existing article RLS boundary');

  await setPrincipal('anon', null, '203.0.113.40');
  const toApprove = await insertComment(publicArticle, 'Review Candidate', 'Please review this comment');
  const toDelete = await insertComment(publicArticle, 'Delete Candidate', 'This pending comment will be deleted');
  const toReject = await insertComment(publicArticle, 'Reject Candidate', 'This pending comment will be rejected');

  await setPrincipal('authenticated', editorId, '203.0.113.41');
  const premiumApproved = await client.query(
    "update public.article_comments set status = 'approved' where id = $1 returning id",
    [premiumInsert.rows[0].id],
  );
  assert.equal(premiumApproved.rowCount, 1);
  await setPrincipal('anon', null, '203.0.113.42');
  const premiumCommentHidden = await client.query('select id from public.article_comments where id = $1', [premiumInsert.rows[0].id]);
  assert.equal(premiumCommentHidden.rowCount, 0);
  pass('approved premium-article comments stay hidden from non-entitled readers');

  await setPrincipal('authenticated', editorId, '203.0.113.41');
  const pendingForEditor = await client.query('select id from public.article_comments where id = $1', [toApprove.rows[0].id]);
  assert.equal(pendingForEditor.rowCount, 1);
  const approved = await client.query(
    "update public.article_comments set status = 'approved', moderated_at = '2000-01-01T00:00:00Z', moderated_by = $2 where id = $1 returning status",
    [toApprove.rows[0].id, readerId],
  );
  assert.equal(approved.rows[0].status, 'approved');
  const approvedMeta = await readModeration(toApprove.rows[0].id);
  assert.equal(approvedMeta.moderated_by, editorId);
  assert.ok(new Date(approvedMeta.moderated_at).getUTCFullYear() >= 2026);
  pass('editor approval overwrites client-supplied moderator ID and timestamp');

  const rejected = await client.query(
    "update public.article_comments set status = 'rejected' where id = $1 returning status",
    [toReject.rows[0].id],
  );
  assert.equal(rejected.rows[0].status, 'rejected');
  const rejectedMeta = await readModeration(toReject.rows[0].id);
  assert.equal(rejectedMeta.moderated_by, editorId);
  pass('editor can reject a pending comment and the database records the actor');

  await expectReject(
    () => client.query("update public.article_comments set status = 'rejected' where id = $1", [toApprove.rows[0].id]),
    'approved comments cannot be transitioned again through direct update',
    'P0001',
  );

  const deleted = await client.query('delete from public.article_comments where id = $1 and status = $2 returning id', [toDelete.rows[0].id, 'pending']);
  assert.equal(deleted.rowCount, 1);
  pass('editor can delete a pending comment');

  await setPrincipal('anon', null, '203.0.113.50');
  const approvedPublic = await client.query('select id from public.article_comments where id = $1', [toApprove.rows[0].id]);
  assert.equal(approvedPublic.rowCount, 1);
  const rejectedPublic = await client.query('select id from public.article_comments where id = $1', [toReject.rows[0].id]);
  assert.equal(rejectedPublic.rowCount, 0);
  pass('rejected comments are not visible to public readers');
  await client.query('RESET ROLE');
  await client.query("update public.articles set status = 'draft' where id = $1", [publicArticle]);
  await setPrincipal('anon', null, '203.0.113.50');
  const hiddenAfterUnpublish = await client.query('select id from public.article_comments where id = $1', [toApprove.rows[0].id]);
  assert.equal(hiddenAfterUnpublish.rowCount, 0);
  pass('approved comments stop being public when their article is unpublished');

  await setPrincipal('anon', null, '203.0.113.60');
  await insertComment(cascadeArticle, 'Cascade Reader', 'This comment follows article deletion');
  await client.query('RESET ROLE');
  await client.query('delete from public.articles where id = $1', [cascadeArticle]);
  const orphaned = await client.query('select id from public.article_comments where article_id = $1', [cascadeArticle]);
  assert.equal(orphaned.rowCount, 0);
  pass('deleting an article cascades its comments as defined by the migration');

  console.log('Article-comments schema/RLS tests completed successfully.');
} finally {
  await client.end().catch(() => {});
}
