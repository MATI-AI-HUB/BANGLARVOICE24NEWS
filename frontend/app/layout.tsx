import './globals.css'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/cookie-banner'
import LearningHub from '@/components/learning-hub'
import PlausibleAnalytics from '@/components/plausible-analytics'
import { notoSerifBengali, hindSiliguri } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'বাংলার ভয়েস | সততা ও নিরপেক্ষতার বিশ্বস্ত মাধ্যম',
  description: 'সত্যের সন্ধানে সার্বক্ষণিক আপনার পাশে।',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bn">
      <head>
        <PlausibleAnalytics />
      </head>
      <body className={`${notoSerifBengali.variable} ${hindSiliguri.variable} bg-paper font-sansbn text-ink antialiased`}>
        <Header />
        {children}
        <Footer />
        <CookieBanner />
        <LearningHub />
      </body>
    </html>
  )
}
