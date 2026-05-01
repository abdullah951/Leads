import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Toaster } from 'sonner';
import { CrispChat } from '@/components/CrispChat';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { DemoBadge } from '@/components/DemoBadge';
import { routing } from '@/libs/I18nRouting';
// Font definitions — swap typefaces in src/styles/fonts.ts
import { fontMono, fontSans } from '@/styles/fonts';
import '@/styles/global.css';

export const metadata: Metadata = {
  icons: [
    {
      rel: 'apple-touch-icon',
      url: '/apple-touch-icon.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      url: '/favicon-16x16.png',
    },
    {
      rel: 'icon',
      url: '/favicon.ico',
    },
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  // Read the theme cookie (set by SettingsView when the user saves Preferences).
  // 'auto' means honour the OS prefers-color-scheme — no data-theme attribute needed.
  // 'light' or 'dark' sets data-theme on <html> so CSS can target [data-theme="dark"].
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('wl_theme')?.value;
  const dataTheme = themeCookie === 'light' || themeCookie === 'dark' ? themeCookie : undefined;

  return (
    // fontSans.variable + fontMono.variable inject --font-sans and --font-mono
    // as CSS custom properties on <html> so global.css @theme can reference them.
    // data-theme is set from the wl_theme cookie to apply light/dark overrides SSR.
    <html lang={locale} className={`${fontSans.variable} ${fontMono.variable}`} data-theme={dataTheme}>
      <body>
        <NextIntlClientProvider>
          <PostHogProvider>
            {props.children}
          </PostHogProvider>

          <DemoBadge />
          <CrispChat />
          {/* Global toast container — z-index matches --z-toast token in global.css */}
          <Toaster position="top-right" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
