export default function EPaperViewer({ edition }: any){
  return (
    <div className="bg-white border p-6">
      {edition.pages.map((page:any)=>(
        <div key={page.number}>
          <h2 className="font-serifbn text-2xl font-bold text-ink dark:text-paper">{page.section}</h2>
          <span className="text-xs text-ink/50 dark:text-paper/50">পৃষ্ঠা {page.number}</span>
          {page.lead && (
            <article className="mb-5 border-b border-border pb-5 dark:border-white/10">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">প্রধান সংবাদ</div>
              {page.lead.image && <img src={page.lead.image} alt={page.lead.headline} className="w-full h-[260px] object-cover mb-3 rounded" />}
              <h3 className="font-serifbn text-3xl font-extrabold leading-tight text-ink dark:text-paper">{page.lead.headline}</h3>
              <p className="mt-3 whitespace-pre-line font-serifbn text-lg leading-[1.85] text-ink/90 dark:text-paper/90">{page.lead.body}</p>
              {page.lead.attribution && <small className="mt-2 block text-xs text-ink/50 dark:text-paper/50">প্রতিবেদন: {page.lead.attribution}</small>}
            </article>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {page.articles.map((article:any, index:number)=>(
              <article key={`${article.headline}-${index}`} className="border-b border-border pb-4 dark:border-white/10">
                {article.image && <img src={article.image} alt={article.headline} className="w-full h-36 object-cover mb-2 rounded" />}
                <h3 className="font-serifbn text-xl font-bold leading-snug text-ink dark:text-paper">{article.headline}</h3>
                <p className="mt-2 whitespace-pre-line font-serifbn leading-[1.75] text-ink/80 dark:text-paper/80">{article.body}</p>
                {article.attribution && <small className="mt-2 block text-xs text-ink/50 dark:text-paper/50">প্রতিবেদন: {article.attribution}</small>}
              </article>
            ))}
          </div>
          {page.briefs && page.briefs.length>0 && (
            <div className="mt-5 border-t-2 border-primary pt-3">
              <h3 className="font-serifbn font-bold text-primary">সংক্ষেপে</h3>
              <ul className="mt-2 grid gap-1 md:grid-cols-2">
                {page.briefs.map((brief:any, index:number)=><li key={`${brief}-${index}`} className="font-serifbn text-sm leading-relaxed">• {brief}</li>)}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
