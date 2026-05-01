import nodemailer from 'nodemailer';
import { Env } from '@/libs/Env';

// Base app URL — used in email links
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.warpleads.com';

const createTransporter = () =>
  nodemailer.createTransport({
    host: Env.SMTP_HOST,
    port: Env.SMTP_PORT,
    auth: { user: Env.SMTP_USER, pass: Env.SMTP_PASS },
  });

/**
 * Sends an OTP email for email verification or password reset.
 * @param to - Recipient email address.
 * @param otp - The 6-digit one-time password.
 * @param purpose - Whether the OTP is for email verification or password reset.
 */
export const sendOtpEmail = async (
  to: string,
  otp: string,
  purpose: 'verify_email' | 'reset_password',
) => {
  const isVerification = purpose === 'verify_email';
  const subject = isVerification ? 'Verify your email' : 'Reset your password';
  const text = isVerification
    ? `Your email verification code is: ${otp}. It expires in 10 minutes.`
    : `Your password reset code is: ${otp}. It expires in 10 minutes.`;

  await createTransporter().sendMail({
    from: Env.SMTP_FROM,
    to,
    subject,
    text,
  });
};

/**
 * Sends a low-credit alert email to the user.
 * Called from the reveal route after deducting credits when remaining < threshold.
 *
 * @param to - Recipient email address.
 * @param remaining - Credits remaining after the deduction.
 * @param threshold - The alert threshold the user configured.
 * @param dailyLimit - The user's daily credit limit (for context in the email).
 */
export async function sendCreditAlertEmail(
  to: string,
  remaining: number,
  threshold: number,
  dailyLimit: number,
): Promise<void> {
  const subject = `⚡ WarpLeads: your credits are running low (${remaining} left)`;

  // Plain-text fallback
  const text = [
    `Hi there,`,
    ``,
    `Your WarpLeads daily credits have dropped below your alert threshold of ${threshold}.`,
    `You currently have ${remaining} / ${dailyLimit} credits remaining today.`,
    ``,
    `Credits reset automatically at midnight (your local time).`,
    `To unlock unlimited reveals, upgrade to the Unlimited plan.`,
    ``,
    `– The WarpLeads team`,
  ].join('\n');

  // HTML version
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#6366f1;margin-bottom:8px">⚡ Credits running low</h2>
      <p style="color:#374151">
        Your WarpLeads daily credits have dropped below your alert threshold of
        <strong>${threshold}</strong>.
      </p>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
        <span style="font-size:32px;font-weight:800;color:#6366f1">${remaining}</span>
        <span style="color:#6b7280;font-size:14px"> / ${dailyLimit} credits remaining today</span>
      </div>
      <p style="color:#6b7280;font-size:13px">
        Credits reset automatically at midnight in your local timezone.
      </p>
      <a href="${APP_URL}/settings"
         style="display:inline-block;margin-top:8px;padding:10px 20px;background:#6366f1;
                color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
        Manage notification settings →
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">
        You received this because you enabled low-credit alerts in your WarpLeads settings.
        <a href="${APP_URL}/settings" style="color:#6366f1">Turn off alerts</a>
      </p>
    </div>
  `;

  await createTransporter().sendMail({
    from: Env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}
