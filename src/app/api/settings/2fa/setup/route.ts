// ── POST /api/settings/2fa/setup ─────────────────────────────────────────────
// Generates a new TOTP secret for the user and returns:
//   - secret:     base32 secret string (held in client memory until /2fa/enable)
//   - qrDataUrl:  PNG data URL of the QR code (ready to drop into <img src>)
//   - manualKey:  user-facing alias of secret for manual entry in authenticator apps
//
// The secret is NOT saved to the DB yet — it is only saved when the user
// successfully verifies a code via /api/settings/2fa/enable.
//
// otplib v13.3.0 API notes:
//   - TOTP class requires explicit crypto + base32 plugins via constructor options
//   - generateSecret() is an instance method on TOTP (not top-level)
//   - generateURI({ label, issuer, secret }) builds the otpauth:// URI
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
// otplib v13.3.0 — must supply crypto and base32 plugins explicitly
import { NobleCryptoPlugin, ScureBase32Plugin, TOTP, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { requireAuth } from '@/utils/ApiAuth';

// Shared TOTP instance with the required crypto + base32 plugins wired up.
// Re-using one instance is fine — it holds no per-request state.
const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

export async function POST() {
  // Authenticate the request
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { email } = auth;

  // Generate a cryptographically-random base32 TOTP secret via the TOTP instance
  const secret = await totp.generateSecret();

  // Build the standard otpauth:// URI recognised by all authenticator apps
  // label = user's email, issuer = app name shown in the authenticator
  const otpauthUri = generateURI({ label: email, issuer: 'WarpLeads', secret });

  // Render the URI as a PNG QR code data URL — server-side so no external service needed
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, {
    width: 200,
    margin: 1,
    color: {
      dark: '#1e1b4b',   // indigo-950 — WarpLeads brand colour on white background
      light: '#ffffff',
    },
  });

  // Return the secret and QR image to the client.
  // The client must hold secret in memory and POST it back with the verified
  // code to /api/settings/2fa/enable — it should NOT persist it anywhere else.
  return NextResponse.json({
    secret,            // base32 string — needed by /2fa/enable
    qrDataUrl,         // data:image/png;base64,…  — rendered as <img src>
    manualKey: secret, // user-facing alias for clarity in the UI
  });
}
