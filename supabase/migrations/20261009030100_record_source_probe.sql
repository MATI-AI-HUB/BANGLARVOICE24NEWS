-- Record the bounded live RSS probe in the production registry.
begin;

with probe(feed_url, item_count) as (
  values
    ('https://www.aljazeera.com/xml/rss/all.xml', 25),
    ('https://feeds.bbci.co.uk/news/world/asia/rss.xml', 17),
    ('https://feeds.bbci.co.uk/news/business/rss.xml', 47),
    ('https://feeds.bbci.co.uk/news/world/europe/rss.xml', 22),
    ('https://feeds.bbci.co.uk/news/health/rss.xml', 52),
    ('https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', 42),
    ('https://feeds.bbci.co.uk/news/technology/rss.xml', 21),
    ('https://feeds.bbci.co.uk/news/world/rss.xml', 36),
    ('https://rss.dw.com/rdf/rss-en-asia', 17),
    ('https://rss.dw.com/rdf/rss-en-eu', 20),
    ('https://rss.dw.com/rdf/rss-en-world', 12),
    ('https://www.france24.com/en/rss', 24),
    ('https://www.japantimes.co.jp/feed/', 30),
    ('https://feeds.npr.org/1006/rss.xml', 10),
    ('https://feeds.npr.org/1007/rss.xml', 10),
    ('https://feeds.npr.org/1019/rss.xml', 10),
    ('https://feeds.npr.org/1001/rss.xml', 10),
    ('https://feeds.npr.org/1004/rss.xml', 10),
    ('https://rss.nytimes.com/services/xml/rss/nyt/World.xml', 56),
    ('https://www.theguardian.com/world/rss', 45),
    ('https://www.theguardian.com/politics/rss', 21),
    ('https://www.theguardian.com/science/rss', 26),
    ('https://www.theguardian.com/uk/technology/rss', 32),
    ('https://www.thehindu.com/news/international/feeder/default.rss', 60),
    ('https://timesofindia.indiatimes.com/rssfeedstopstories.cms', 47),
    ('https://www.prothomalo.com/stories.rss', 45)
)
update public.news_sources s
set last_probe_at = now(),
    last_probe_status = 'ok',
    last_probe_http_status = 200,
    last_probe_items = p.item_count,
    last_probe_error = null,
    consecutive_failures = 0,
    updated_at = now()
from probe p
where s.feed_url = p.feed_url
  and s.enabled = true
  and s.kill_switch = false;

commit;
