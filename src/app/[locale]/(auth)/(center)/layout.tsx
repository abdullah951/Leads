// Auth layout — full-screen split panel.
//
// Left  (hidden on mobile): dark `#0F172A` brand panel with logo, headline,
//        dot-grid texture, orb glow, and 4 credibility bullet points.
// Right: pure white panel that centers the form (sign-in / sign-up / etc.)
//
// Mobile: only the white right panel is shown (left collapses away).
import { setRequestLocale } from 'next-intl/server';

export default async function CenteredLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen">

      {/* ── LEFT PANEL — dark brand side ────────────────────────────────────────
          Hidden on mobile (md:flex). Contains logo, headline, and bullet points.
          dot-grid + orb glow mirror the landing page Hero aesthetics. */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between bg-[#0F172A] overflow-hidden px-12 py-10">

        {/* Background: radial glow top-center */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[400px]"
          style={{
            background:
              'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(99,102,241,0.28) 0%, transparent 70%)',
          }}
        />

        {/* Background: soft orb bottom-right */}
        <div
          className="pointer-events-none absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 60%)',
          }}
        />

        {/* Background: dot-grid texture overlay */}
        <div className="dot-grid pointer-events-none absolute inset-0" />

        {/* ── Logo ── */}
        <div className="relative z-10 flex items-center gap-2.5">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)' }}
          >
            {/* Zap SVG inline */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
          <span className="font-bold text-white text-xl">Warp</span>
          <span className="font-bold text-[#818CF8] text-xl -ml-1">Leads</span>
        </div>

        {/* ── Center content — headline + bullets ── */}
        <div className="relative z-10 flex flex-col gap-8">

          {/* Headline */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#4F46E5] mb-3">
              B2B Contact Intelligence
            </p>
            <h2 className="text-3xl font-extrabold leading-snug text-white">
              Build cold email lists{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #A5B4FC, #818CF8)',
                }}
              >
                that actually reach the inbox.
              </span>
            </h2>
          </div>

          {/* Credibility bullets — 4 key facts, no testimonial */}
          <ul className="flex flex-col gap-4">
            {[
              { stat: '102M+',  text: 'verified contacts ready to search' },
              { stat: '<2%',    text: 'average bounce rate with VerifyFirst™' },
              { stat: '500+',   text: 'tech stack filters to nail your ICP' },
              { stat: '3 min',  text: 'from signup to your first verified reveal' },
            ].map(item => (
              <li key={item.stat} className="flex items-center gap-4">
                {/* Stat chip */}
                <span
                  className="w-16 flex-shrink-0 rounded-lg px-2 py-1 text-center text-xs font-extrabold text-white"
                  style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
                >
                  {item.stat}
                </span>
                {/* Description */}
                <span className="text-sm text-[#94A3B8] leading-snug">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Bottom — tagline ── */}
        <p className="relative z-10 text-xs text-[#334155]">
          Powered by VerifyFirst™ — every email validated before you spend a credit.
        </p>
      </div>

      {/* ── RIGHT PANEL — white form side ───────────────────────────────────────
          Full width on mobile, half width on md+.
          Centers the child form vertically and horizontally. */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {props.children}
        </div>
      </div>

    </div>
  );
}
