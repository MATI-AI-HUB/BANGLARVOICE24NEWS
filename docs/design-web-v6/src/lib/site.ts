export const SITE = {
  name: "বাংলার ভয়েস",
  nameEn: "Banglar Voice",
  tagline: "সত্য · নিরপেক্ষ · নির্ভরযোগ্য",
  url: "https://banglarvoice24news.com",
  email: "editor@banglarvoice24news.com",
  locale: "bn_BD",
  description:
    "বাংলার ভয়েস — জাতীয় ও আন্তর্জাতিক সর্বশেষ সংবাদ, রাজনীতি, অর্থনীতি, খেলাধুলা, বিনোদন, প্রযুক্তি ও মতামত।",
} as const;

export function abs(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE.name,
    alternateName: SITE.nameEn,
    url: SITE.url,
    email: SITE.email,
    slogan: SITE.tagline,
    foundingLocation: { "@type": "Place", name: "Dhaka, Bangladesh" },
    ethicsPolicy: abs("/about#ethics"),
    correctionsPolicy: abs("/about#corrections"),
    diversityPolicy: abs("/about#diversity"),
    masthead: abs("/about#masthead"),
    ownershipFundingInfo: abs("/about#ownership"),
    actionableFeedbackPolicy: abs("/about#feedback"),
    verificationFactCheckingPolicy: abs("/about#factcheck"),
    sameAs: [
      "https://www.linkedin.com/company/banglarvoice24news",
      "https://x.com/banglarvoice24",
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    inLanguage: "bn",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function readingTimeBn(paragraphs: string[]) {
  const words = paragraphs.join(" ").trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 180));
  return `${minutes.toLocaleString("bn-BD")} মিনিট পাঠ`;
}

export function newsArticleJsonLd(a: {
  slug: string;
  title: string;
  dek: string;
  author: string;
  publishedAt: string;
  image: string;
  body: string[];
  categoryLabel: string;
  tags?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": abs(`/news/${a.slug}`) },
    headline: a.title.slice(0, 110),
    description: a.dek,
    image: [abs(a.image)],
    datePublished: a.publishedAt,
    dateModified: a.publishedAt,
    inLanguage: "bn",
    articleSection: a.categoryLabel,
    keywords: (a.tags ?? []).join(", "),
    wordCount: a.body.join(" ").split(/\s+/).length,
    author: { "@type": "Person", name: a.author },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: SITE.name,
      url: SITE.url,
    },
    isAccessibleForFree: true,
  };
}


export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}
