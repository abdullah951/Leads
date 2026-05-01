/**
 * fonts.ts
 *
 * Single source of truth for all typefaces used in the app.
 * To swap a font in the future, change it here — the CSS variables
 * --font-sans and --font-mono will propagate everywhere automatically.
 *
 * Usage:
 *   - `fontSans.variable`  → injects --font-sans CSS variable on <html>
 *   - `fontMono.variable`  → injects --font-mono CSS variable on <html>
 *   - Apply `var(--font-sans)` / `var(--font-mono)` in global.css @theme
 *
 * Fonts:
 *   - Inter           → high-legibility sans-serif for names, labels, body text
 *   - JetBrains Mono  → monospaced for numbers, tags, email addresses, phone numbers
 */

import { Inter, JetBrains_Mono } from 'next/font/google';

// High-legibility sans — used for names, headings, body copy
export const fontSans = Inter({
  subsets: ['latin'],
  // CSS variable name injected onto <html> by Next.js font loader
  variable: '--font-sans',
  display: 'swap',
});

// Monospaced — used for numbers, emails, phone numbers, tags, code
export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  // Only load the weights we actually use to keep bundle lean
  weight: ['400', '500'],
});
