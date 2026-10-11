export default function EPaperViewer({ edition }: any){
  return (
    <div className="bg-white border border-black/10 p-6 shadow-sm">
      {edition.pages.map((page:any)=>(
        <div key={page.number}>
          <div className="flex justify-between items-baseline border-b-2 border-black pb-2 mb-4">
            <h2 className="font-serifbn text-2xl font-bold">{page.section}</h2>
            <span className="text-xs">পৃষ্ঠা {page.number}</span>
          </div>
          {page.lead && (
            <article className="mb-6 border-b pb-6">
              <div className="mb-2 text-xs font-bold uppercase text-red-600">প্রধান সংবাদ</div>
              {page.lead.image && <img src={page.lead.image} alt={page.lead.headline} className="w-full h-[280px] object-cover mb-4 rounded-sm" />}
              <h3 className="font-serifbn text-3xl font-extrabold leading-tight">{page.lead.headline}</h3>
              <p className="mt-3 font-serifbn text-[17px] leading-[1.8] text-black/80 whitespace-pre-line">{page.lead.body}</p>
            </article>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            {page.articles.map((a:any,i:number)=>(
              <article key={i} className="border-b pb-4">
                {a.image && <img src={a.image} alt={a.headline} className="w-full h-40 object-cover mb-2 rounded-sm" />}
                <h4 className="font-serifbn text-xl font-bold leading-snug">{a.headline}</h4>
                <p className="mt-2 text-sm leading-6 text-black/70 whitespace-pre-line">{a.body}</p>
              </article>
            ))}
          </div>
          {page.briefs?.length>0 && (
            <div className="mt-6 border-t-2 border-black pt-3">
              <h3 className="font-bold">সংক্ষেপে</h3>
              <ul className="mt-2 grid gap-1 md:grid-cols-2 text-sm">{page.briefs.map((b:any,i:number)=><li key={i}>• {b}</li>)}</ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
