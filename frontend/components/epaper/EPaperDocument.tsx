'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { EPaperEdition, EPaperPage } from '../../lib/epaper/types';

Font.register({
  family: 'BVSerif',
  src: '/fonts/SolaimanLipi.ttf',
});

Font.registerHyphenationCallback((word: string) => [word]);

const C = {
  ink: '#0F0F0F',
  muted: '#6B7280',
  border: '#E5E2DE',
  primary: '#C41E1E',
  navy: '#0F172A',
  paper: '#FFFEFB',
};

const bn = (v: number | string) =>
  String(v).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);

const styles = StyleSheet.create({
  // ── Shared ───────────────────────────────────
  pageBase: {
    backgroundColor: C.paper,
    color: C.ink,
    fontFamily: 'BVSerif',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: `1 solid ${C.border}`,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: C.muted,
  },
  // ── Page 1: Front (A3 landscape) ─────────────
  frontPage: {
    paddingTop: 32,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  masthead: {
    borderBottom: `4 solid ${C.primary}`,
    paddingBottom: 10,
    marginBottom: 6,
    alignItems: 'center',
  },
  mastheadTitle: {
    fontSize: 38,
    fontWeight: 700,
    color: C.primary,
    letterSpacing: 1,
  },
  mastheadTagline: {
    fontSize: 9,
    color: C.muted,
    marginTop: 4,
    letterSpacing: 2,
  },
  editionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: C.muted,
    borderBottom: `1 solid ${C.border}`,
    paddingBottom: 6,
    marginBottom: 16,
  },
  frontBody: {
    flexDirection: 'row',
    gap: 18,
  },
  frontLead: {
    width: '62%',
    paddingRight: 16,
    borderRight: `1 solid ${C.border}`,
  },
  frontSide: {
    width: '35%',
  },
  kicker: {
    fontSize: 9,
    fontWeight: 700,
    color: C.primary,
    marginBottom: 4,
    letterSpacing: 1.5,
  },
  leadHeadline: {
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1.3,
    marginBottom: 10,
  },
  leadBody: {
    fontSize: 10.5,
    lineHeight: 1.75,
    textAlign: 'justify',
  },
  attribution: {
    fontSize: 8.5,
    color: C.muted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  sideArticle: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottom: `1 solid ${C.border}`,
  },
  sideHeadline: {
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.35,
    marginBottom: 4,
  },
  sideBody: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#333333',
    textAlign: 'justify',
  },
  briefsBox: {
    marginTop: 8,
    padding: 10,
    borderTop: `2 solid ${C.primary}`,
  },
  briefsTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: C.primary,
    marginBottom: 6,
    letterSpacing: 1,
  },
  briefRow: {
    flexDirection: 'row',
    fontSize: 9,
    marginBottom: 4,
    lineHeight: 1.5,
  },
  briefBullet: {
    color: C.primary,
    marginRight: 5,
  },
  // ── Page 2-3: Section pages (A4 portrait) ────
  sectionPage: {
    paddingTop: 36,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  sectionHeader: {
    borderBottom: `3 solid ${C.navy}`,
    paddingBottom: 8,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionName: {
    fontSize: 22,
    fontWeight: 700,
    color: C.navy,
  },
  sectionMeta: {
    fontSize: 8,
    color: C.muted,
  },
  articleBlock: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottom: `1 solid ${C.border}`,
  },
  articleHeadline: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.4,
    marginBottom: 5,
  },
  articleBody: {
    fontSize: 9.5,
    lineHeight: 1.7,
    color: '#222222',
    textAlign: 'justify',
  },
  twoColGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  col: {
    width: '50%',
  },
});

function DocFooter({
  date,
  pageNum,
  total,
}: {
  date: string;
  pageNum: number;
  total: number;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text>বাংলার ভয়েস · {date}</Text>
      <Text>
        বাংলার ভয়েস · banglarvoice24news.com · পৃষ্ঠা {bn(pageNum)}/{bn(total)}
      </Text>
    </View>
  );
}

function FrontPage({
  edition,
  page,
}: {
  edition: EPaperEdition;
  page: EPaperPage;
}) {
  return (
    <Page size="A3" orientation="landscape" style={[styles.pageBase, styles.frontPage]}>
      <View style={styles.masthead}>
        <Text style={styles.mastheadTitle}>বাংলার ভয়েস — দৈনিক ই-পেপার</Text>
        <Text style={styles.mastheadTagline}>
          স্বাধীন · দায়িত্বশীল · নির্ভরযোগ্য
        </Text>
      </View>

      <View style={styles.editionRow}>
        <Text>
          বর্ষ {bn(edition.volume)} · সংখ্যা {bn(edition.issue)}
        </Text>
        <Text>{edition.editionLabel} · ঢাকা</Text>
      </View>

      <View style={styles.frontBody}>
        {page.lead && (
          <View style={styles.frontLead}>
            <Text style={styles.kicker}>
              আজকের প্রধান সংবাদ · {page.lead.category || 'সর্বশেষ'}
            </Text>
            <Text style={styles.leadHeadline}>{page.lead.headline}</Text>
            <Text style={styles.leadBody}>{page.lead.body}</Text>
            {page.lead.attribution ? (
              <Text style={styles.attribution}>
                প্রতিবেদন: {page.lead.attribution}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.frontSide}>
          {page.articles.map((a, i) => (
            <View key={i} style={styles.sideArticle} wrap={false}>
              <Text style={styles.sideHeadline}>{a.headline}</Text>
              <Text style={styles.sideBody}>{a.body}</Text>
              {a.attribution ? (
                <Text style={styles.attribution}>— {a.attribution}</Text>
              ) : null}
            </View>
          ))}

          {page.briefs && page.briefs.length > 0 && (
            <View style={styles.briefsBox}>
              <Text style={styles.briefsTitle}>সংক্ষেপে</Text>
              {page.briefs.map((b, i) => (
                <View key={i} style={styles.briefRow}>
                  <Text style={styles.briefBullet}>•</Text>
                  <Text>{b}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <DocFooter
        date={edition.editionLabel}
        pageNum={page.number}
        total={edition.pages.length}
      />
    </Page>
  );
}

function SectionPage({
  edition,
  page,
  twoColumn = false,
}: {
  edition: EPaperEdition;
  page: EPaperPage;
  twoColumn?: boolean;
}) {
  const half = Math.ceil(page.articles.length / 2);
  const left = twoColumn ? page.articles.slice(0, half) : page.articles;
  const right = twoColumn ? page.articles.slice(half) : [];

  return (
    <Page size="A4" orientation="portrait" style={[styles.pageBase, styles.sectionPage]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionName}>{page.section}</Text>
        <Text style={styles.sectionMeta}>{edition.editionLabel}</Text>
      </View>

      {twoColumn ? (
        <View style={styles.twoColGrid}>
          <View style={styles.col}>
            {left.map((a, i) => (
              <View key={i} style={styles.articleBlock} wrap={false}>
                <Text style={styles.articleHeadline}>{a.headline}</Text>
                <Text style={styles.articleBody}>{a.body}</Text>
                {a.attribution ? (
                  <Text style={styles.attribution}>— {a.attribution}</Text>
                ) : null}
              </View>
            ))}
          </View>
          <View style={styles.col}>
            {right.map((a, i) => (
              <View key={i} style={styles.articleBlock} wrap={false}>
                <Text style={styles.articleHeadline}>{a.headline}</Text>
                <Text style={styles.articleBody}>{a.body}</Text>
                {a.attribution ? (
                  <Text style={styles.attribution}>— {a.attribution}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : (
        page.articles.map((a, i) => (
          <View key={i} style={styles.articleBlock} wrap={false}>
            <Text style={styles.articleHeadline}>{a.headline}</Text>
            <Text style={styles.articleBody}>{a.body}</Text>
            {a.attribution ? (
              <Text style={styles.attribution}>— {a.attribution}</Text>
            ) : null}
          </View>
        ))
      )}

      <DocFooter
        date={edition.editionLabel}
        pageNum={page.number}
        total={edition.pages.length}
      />
    </Page>
  );
}

export function EPaperDocument({ edition }: { edition: EPaperEdition }) {
  return (
    <Document
      title={`বাংলার ভয়েস ই-পেপার — ${edition.editionLabel}`}
      author="Banglar Voice"
      subject={`Daily E-Paper — ${edition.editionLabel}`}
      creator="banglarvoice24news.com"
      language="bn"
    >
      {edition.pages.map((p) => {
        if (p.layout === 'front') {
          return <FrontPage key={p.number} edition={edition} page={p} />;
        }
        if (p.layout === 'two-column') {
          return (
            <SectionPage
              key={p.number}
              edition={edition}
              page={p}
              twoColumn
            />
          );
        }
        return <SectionPage key={p.number} edition={edition} page={p} />;
      })}
    </Document>
  );
}
