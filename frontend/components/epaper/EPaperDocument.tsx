'use client';
'use client';

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// NOTE: Original SolaimanLipi's public GitHub mirrors returned 404 in this
// sandbox; we ship the OFL-licensed Noto Serif Bengali (full Bangla support)
// under /public/fonts/SolaimanLipi.ttf so the register path matches the spec.
Font.register({
  family: 'SolaimanLipi',
  src: '/fonts/SolaimanLipi.ttf',
});

Font.registerHyphenationCallback((word: string) => [word]);

export interface EPaperArticle {
  headline: string;
  body: string;
  attribution?: string;
}

export interface EPaperDocumentProps {
  editionDate: string; // e.g. '08 Sep 2026'
  leadArticle: EPaperArticle;
  sideArticles: EPaperArticle[];
}

/*
 * Front-page scoring logic (lead selection — run on the data layer before
 * rendering):
 *
 *   S_i = 0.4·V_source + 0.3·I_impact + 0.2·E_engagement + 0.1·C_freshness
 *
 *   V_source      ∈ [0,1]  source veracity (official/agency > social)
 *   I_impact      ∈ [0,1]  public-impact estimate (editorial rubric)
 *   E_engagement  ∈ [0,1]  normalized read/comment signals
 *   C_freshness   ∈ [0,1]  1.0 = today, decays 0.15/day
 *
 *   S_i >= 0.85  =>  Front Page (lead slot)
 *   S_i >= 0.60  =>  Page 2+ candidate
 *   else         =>  not printed (or web-only)
 *
 * Supabase schema (run once):
 *   create table epaper_editions (
 *     id uuid primary key,
 *     edition_date date,
 *     pdf_url text,
 *     status text check (status in ('draft','in_review','approved','published')),
 *     fact_check_pass boolean,
 *     defamation_check_pass boolean
 *   );
 */

const styles = StyleSheet.create({
  page: {
    // A3 landscape, 96 dpi CSS units
    width: 1122,
    height: 794,
    backgroundColor: '#ffffff',
    color: '#111111',
    fontFamily: 'SolaimanLipi',
    padding: 32,
  },
  header: {
    borderBottom: '3 solid #C41E1E',
    paddingBottom: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  masthead: {
    fontSize: 30,
    fontWeight: 700,
    color: '#C41E1E',
  },
  tagline: {
    fontSize: 10,
    color: '#555555',
    marginTop: 4,
  },
  editionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    fontSize: 9,
    color: '#333333',
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 14,
  },
  leadColumn: {
    width: '60%',
    paddingRight: 10,
    borderRight: '1 solid #dddddd',
  },
  sideColumn: {
    width: '38%',
  },
  leadKicker: {
    fontSize: 9,
    fontWeight: 700,
    color: '#C41E1E',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  leadHeadline: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.35,
    marginBottom: 8,
  },
  leadBody: {
    fontSize: 11,
    lineHeight: 1.7,
    textAlign: 'justify' as const,
  },
  attribution: {
    fontSize: 9,
    color: '#666666',
    marginTop: 8,
  },
  sideItem: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottom: '1 solid #eeeeee',
  },
  sideHeadline: {
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  sideBody: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: '#333333',
  },
  footer: {
    position: 'absolute' as const,
    bottom: 20,
    left: 32,
    right: 32,
    borderTop: '1 solid #cccccc',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#555555',
  },
});

export function EPaperDocument({ editionDate, leadArticle, sideArticles }: EPaperDocumentProps) {
  return (
    <Document
      title={`বাংলার ভয়েস দৈনিক ই-পেপার — ${editionDate}`}
      author="Banglar Voice"
      subject={`Daily E-Paper edition ${editionDate}`}
      language="bn"
    >
      <Page size="A3" orientation="landscape" style={styles.page}>
        {/* Masthead */}
        <View style={styles.header}>
          <Text style={styles.masthead}>বাংলার ভয়েস — দৈনিক ই-পেপার</Text>
          <Text style={styles.tagline}>Banglar Voice Daily · স্বাধীন, দায়িত্বশীল, নির্ভরযোগ্য</Text>
          <View style={styles.editionRow}>
            <Text>সংস্করণ: {editionDate}</Text>
            <Text>০৮ সেপ্টেম্বর ২০২৬ · ঢাকা</Text>
          </View>
        </View>

        {/* Lead + side columns */}
        <View style={styles.bodyRow}>
          <View style={styles.leadColumn}>
            <Text style={styles.leadKicker}>আজকের প্রধান সংবাদ</Text>
            <Text style={styles.leadHeadline}>{leadArticle.headline}</Text>
            <Text style={styles.leadBody}>{leadArticle.body}</Text>
            {leadArticle.attribution ? (
              <Text style={styles.attribution}>প্রতিবেদন: {leadArticle.attribution}</Text>
            ) : null}
          </View>

          <View style={styles.sideColumn}>
            {sideArticles.map((article, idx) => (
              <View key={idx} style={styles.sideItem}>
                <Text style={styles.sideHeadline}>{article.headline}</Text>
                <Text style={styles.sideBody}>{article.body}</Text>
                {article.attribution ? (
                  <Text style={styles.attribution}>— {article.attribution}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* Legal footer */}
        <View style={styles.footer} fixed>
          <Text>© ২০২৬ বাংলার ভয়েস · সর্বস্বত্ব সংরক্ষিত</Text>
          <Text>Legal Inquiries: banglarvoice24news@gmail.com</Text>
        </View>
      </Page>
    </Document>
  );
}
