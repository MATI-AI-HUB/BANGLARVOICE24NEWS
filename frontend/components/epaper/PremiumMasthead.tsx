export function PremiumMasthead({ dateBn }: { dateBn: string }) {
  return (
    <div className="bg-[#f4f1ea] border-b border-[#c5c0b5]">
      <div className="max-w-5xl mx-auto px-4">
        <div className="h-[3px] bg-[#1a1a1a] w-full mt-2" />
        <div className="flex justify-between text-[10px] font-mono uppercase tracking-[0.1em] py-1.5 text-[#3a3a3a]">
          <span>ঢাকা | {dateBn}</span>
          <span className="hidden md:inline">প্রতিষ্ঠাতা: বাংলার ভয়েস</span>
          <span>মূল্য ১০ টাকা • banglarvoice24news.com</span>
        </div>
        <div className="border-y-[3px] border-double border-[#2d2a26] py-3 text-center">
          <h1 className="font-serifbn font-black text-[32px] md:text-[48px] leading-none text-[#1a1a1a]">বাংলার ভয়েস <span className="font-sans text-[16px] align-super ml-1">| 24NEWS</span></h1>
          <p className="font-serifbn italic text-[13px] text-[#2d2a26] mt-1">বাংলার কণ্ঠস্বর - সত্যের পথে</p>
        </div>
      </div>
    </div>
  )
}
