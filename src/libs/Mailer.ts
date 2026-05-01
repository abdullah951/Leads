// ── Mailer ────────────────────────────────────────────────────────────────────
// Thin wrapper around nodemailer that creates a single reusable transporter
// from the SMTP_* environment variables defined in Env.ts.
//
// Usage:
//   import { sendMail } from '@/libs/Mailer';
//   await sendMail({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi</p>' });
// ─────────────────────────────────────────────────────────────────────────────

import nodemailer from 'nodemailer';
import { Env } from '@/libs/Env';

// ── Transporter singleton ──────────────────────────────────────────────────────
// Created once at module load time and reused across all requests.
const transporter = nodemailer.createTransport({
  host: Env.SMTP_HOST,
  port: Env.SMTP_PORT,
  // Use TLS when port is 465, STARTTLS otherwise
  secure: Env.SMTP_PORT === 465,
  auth: {
    user: Env.SMTP_USER,
    pass: Env.SMTP_PASS,
  },
});

// ── sendMail ─────────────────────────────────────────────────────────────────

/**
 * Sends an email via the configured SMTP transporter.
 *
 * @param options - Recipient address, subject line, and HTML body.
 * @returns The nodemailer send result (messageId, etc.).
 */
export async function sendMail(options: {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML body — use semantic HTML for best client compatibility */
  html: string;
  /** Optional plain-text fallback */
  text?: string;
}) {
  return transporter.sendMail({
    from: Env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    // Provide text fallback — use supplied text or strip tags as a last resort
    text: options.text ?? options.html.replace(/<[^>]+>/g, ''),
  });
}
