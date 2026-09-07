import { api } from '../../../lib/api';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AudioPlayerWidget } from '../../../components/audio-player';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const a = await api.article(params.slug);
    return {
      title: a.title_bn,
      description: a.dek_bn || a.seo_description,
      openGraph: { title: a.title_bn, description: a.dek_bn, type: 'article' },
    };
  } catch {
    return { title: 'পাতা নেই' };
  }
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  let a: any;
  try {
    a = await api.article(params.slug);
  } catch {
    notFound();
  }

  const narrateText = `${a.title_bn}। ${a.dek_bn || ''} ${(a.body_bn || '').replace(/<[^>]*>/g, ' ')}`;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 pb-28">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
        <span>{a.category}</span>
        {typeof a.bias_index === 'number' && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800">
            বায়াস স্কোর {a.bias_index}/100
          </span>
        )}
      </div>
      <h1 className="mt-2 font-serifbn text-3xl font-extrabold leading-tight md:text-4xl">{a.title_bn}</h1>
      {a.dek_bn && <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">{a.dek_bn}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        {a.author_name && <span>লেখক: {a.author_name}</span>}
        {a.reading_time_min ? <span>• {a.reading_time_min} মিনিট পড়া</span> : null}
        {a.published_at ? <span>• {new Date(a.published_at).toLocaleDateString('bn-BD', { dateStyle: 'long' })}</span> : null}
      </div>
      {a.featured_image && (
        <img src={a.featured_image} alt={a.title_bn} className="mt-6 aspect-video w-full rounded object-cover" />
      )}
      <div
        className="prose mt-8 max-w-none whitespace-pre-wrap font-serifbn text-lg leading-[1.9]"
        dangerouslySetInnerHTML={{ __html: a.body_bn }}
      />
      {a.tags?.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {a.tags.map((t: string) => (
            <span key={t} className="rounded-full bg-muted px-3 py-1 text-sm">#{t}</span>
          ))}
        </div>
      )}

      <AudioPlayerWidget text={narrateText} title={a.title_bn} />
    </article>
  );
}
