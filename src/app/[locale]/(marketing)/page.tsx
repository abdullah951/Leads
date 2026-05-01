// WarpLeads marketing landing page — served at the / route.
//
// Pattern: server component → 'use client' child.
// The Next.js page is a server component (required for setRequestLocale),
// but all interactive logic lives in LandingPage (a client component).

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { LandingPage } from '@/components/landing/LandingPage';

type IIndexProps = {
  params: Promise<{ locale: string }>;
};

// Page-level Open Graph metadata
export const metadata: Metadata = {
  title: 'WarpLeads — Verified B2B Contact Intelligence',
  description:
    'Search 102 million verified contacts. Reveal emails and phone numbers. Export to your CRM or sequencer. Built for cold emailers, GTM engineers, and email marketers.',
  openGraph: {
    title: 'WarpLeads — Build cold email lists that actually reach the inbox',
    description:
      'Search 102M verified contacts by tech stack, job title, and 12 other filters. Sub-2% bounce rate guaranteed.',
    type: 'website',
  },
};

// Server component — sets locale then delegates rendering to the client component
export default async function IndexPage(props: IIndexProps) {
  const { locale } = await props.params;

  // Required by next-intl for static generation with locale segments
  setRequestLocale(locale);

  // Render the full landing page — all interactivity is inside LandingPage
  return <LandingPage />;
}
