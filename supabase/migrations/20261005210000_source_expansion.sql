-- Expand the live source pool with reputable category feeds.
-- Every row is idempotent and remains independently kill-switchable.

begin;

insert into public.news_sources (name, feed_url, enabled, kill_switch, interval_minutes, licence_note)
values
  ('BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml', true, false, 15, 'Public RSS'),
  ('BBC Technology', 'https://feeds.bbci.co.uk/news/technology/rss.xml', true, false, 15, 'Public RSS'),
  ('BBC Science', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', true, false, 15, 'Public RSS'),
  ('BBC Health', 'https://feeds.bbci.co.uk/news/health/rss.xml', true, false, 15, 'Public RSS'),
  ('BBC Asia', 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', true, false, 15, 'Public RSS'),
  ('BBC Europe', 'https://feeds.bbci.co.uk/news/world/europe/rss.xml', true, false, 15, 'Public RSS'),
  ('NPR US', 'https://feeds.npr.org/1001/rss.xml', true, false, 15, 'Public RSS'),
  ('NPR Business', 'https://feeds.npr.org/1006/rss.xml', true, false, 15, 'Public RSS'),
  ('NPR Technology', 'https://feeds.npr.org/1019/rss.xml', true, false, 15, 'Public RSS'),
  ('NPR Science', 'https://feeds.npr.org/1007/rss.xml', true, false, 15, 'Public RSS'),
  ('The Guardian Politics', 'https://www.theguardian.com/politics/rss', true, false, 15, 'Public RSS'),
  ('The Guardian Technology', 'https://www.theguardian.com/uk/technology/rss', true, false, 15, 'Public RSS'),
  ('The Guardian Science', 'https://www.theguardian.com/science/rss', true, false, 15, 'Public RSS'),
  ('DW Europe', 'https://rss.dw.com/rdf/rss-en-eu', true, false, 15, 'Public RSS'),
  ('DW Asia', 'https://rss.dw.com/rdf/rss-en-asia', true, false, 15, 'Public RSS'),
  ('France 24 International', 'https://www.france24.com/en/rss', true, false, 15, 'Public RSS')
on conflict (feed_url) do nothing;

commit;
