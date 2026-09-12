export interface EPaperArticle {
  id?: string;
  slug?: string;
  headline: string;
  body: string;
  attribution?: string;
  category?: string;
}

export type EPaperLayout = 'front' | 'two-column' | 'grid' | 'briefs';

export interface EPaperPage {
  number: number;
  section: string;
  layout: EPaperLayout;
  lead?: EPaperArticle;
  articles: EPaperArticle[];
  briefs?: string[];
}

export interface EPaperEdition {
  editionDate: string;
  editionLabel: string;
  volume: string;
  issue: number;
  pages: EPaperPage[];
  pdfUrl?: string;
}
