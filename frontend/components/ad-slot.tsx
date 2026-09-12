// frontend/components/ad-slot.tsx
// Reusable Ad component (AdSense + Direct Ads)
// Automatically hides for premium users

'use client';

interface AdSlotProps {
  format?: string;
  slotId?: string;
  type?: 'adsense' | 'direct';
  isPremium?: boolean;
  className?: string;
}

export function AdSlot({ slotId, type, isPremium = false, className = '' }: AdSlotProps) {
  // Premium users get an ad-free experience
  if (isPremium) {
    return null; 
  }

  if (type === 'direct') {
    // Direct Ad (Custom banner/link)
    return (
      <a 
        href="/advertise" 
        target="_blank" 
        rel="noopener noreferrer"
        className={`block w-full rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center transition hover:bg-neutral-100 ${className}`}
      >
        <div className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          বিজ্ঞাপন
        </div>
        <div className="mt-2 text-lg font-bold text-neutral-700">
          আপনার বিজ্ঞাপন এখানে দিন
        </div>
        <div className="mt-1 text-sm text-neutral-500">
          সরাসরি বিজ্ঞাপনের জন্য আমাদের সাথে যোগাযোগ করুন
        </div>
      </a>
    );
  }

  // Google AdSense (Mock UI for now)
  // TODO: Replace with real AdSense script in production
  return (
    <div className={`flex h-[90px] w-full items-center justify-center rounded-lg border border-dashed border-amber-200 bg-amber-50 ${className}`}>
      <div className="text-center">
        <div className="text-xs font-medium uppercase tracking-wider text-amber-600">
          Google AdSense
        </div>
        <div className="mt-1 text-sm text-amber-800">
          Ad Slot ID: {slotId}
        </div>
      </div>
      {/* 
        Production AdSense Code:
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
             data-ad-slot={slotId}
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
      */}
    </div>
  );
}
