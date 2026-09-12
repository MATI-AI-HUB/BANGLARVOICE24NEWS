'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

// @react-pdf/renderer client-only ESM প্যাকেজ; Server Component-এ সরাসরি
// import করলে prerender-এ "Element type is invalid" এরর দেয়।
// Next.js 15-এ ssr:false শুধু Client Component-এ অনুমোদিত, তাই এই wrapper।
const EPaperDocument = dynamic(
  () => import('./EPaperDocument').then((m) => m.EPaperDocument),
  {
    ssr: false,
    loading: () => (
      <p className="p-8 text-center text-sm text-ink/60">
        ই-পেপার লোড হচ্ছে…
      </p>
    ),
  }
);

type EPaperDocumentProps = ComponentProps<typeof EPaperDocument>;

export default function EPaperViewer(props: EPaperDocumentProps) {
  return <EPaperDocument {...props} />;
}
