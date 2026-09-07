/**
 * Server-only newsroom data access.
 * Reads editor-approved rows from the automation queue so approved stories
 * become real, indexable pages without a rebuild.
 */

export type PublishedStory = {
  slug: string;
  title: string;
  dek: string;
  category: string;
  body: string[];
  source: string;
  tags: string[];
  image_url: string | null;
  author: string;
  publishedAt: string;
};

type Row = {
  slug: string;
  title: string;
  dek: string | null;
  category: string;
  body: string[] | null;
  source: string | null;
  tags: string[] | null;
  image_url: string | null;
  agent: string | null;
  updated_at: string;
  created_at: string;
};

function toStory(r: Row): PublishedStory {
  return {
    slug: r.slug,
    title: r.title,
    dek: r.dek ?? "",
    category: r.category,
    body: r.body ?? [],
    source: r.source ?? "",
    tags: r.tags ?? [],
    image_url: r.image_url,
    author: r.agent ?? "বাংলার ভয়েস ডেস্ক",
    publishedAt: r.updated_at ?? r.created_at,
  };
}

export async function listPublishedStories(limit = 100): Promise<PublishedStory[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("newsroom_queue")
      .select("slug, title, dek, category, body, source, tags, image_url, agent, updated_at, created_at")
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => toStory(r as Row));
  } catch (e) {
    console.error("[newsroom] listPublishedStories failed", e);
    return [];
  }
}

export async function getPublishedStory(slug: string): Promise<PublishedStory | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("newsroom_queue")
      .select("slug, title, dek, category, body, source, tags, image_url, agent, updated_at, created_at")
      .eq("status", "approved")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toStory(data as Row) : null;
  } catch (e) {
    console.error("[newsroom] getPublishedStory failed", e);
    return null;
  }
}
