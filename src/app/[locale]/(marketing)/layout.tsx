// Marketing layout — no shared navbar or chrome.
// The LandingPage component renders its own Navbar internally.
import { setRequestLocale } from 'next-intl/server';

export default async function MarketingLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  // Render children full-screen with no wrapper — the landing page owns its own layout
  return <>{props.children}</>;
}
