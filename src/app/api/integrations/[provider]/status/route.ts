// GET /api/integrations/[provider]/status
// Returns whether the OAuth app credentials for a given provider are configured
// in the server environment (i.e. CLIENT_ID and CLIENT_SECRET env vars are set).
//
// This lets the client show a "setup required" state in the drawer before the
// user tries to click Connect and gets redirected with ?error=not_configured.
//
// Response: { configured: boolean; callbackUrl: string }

import { NextResponse } from 'next/server';
import { getProviderConfig } from '@/utils/IntegrationOAuth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  // Load provider config — returns null if provider is unknown
  const cfg = getProviderConfig(provider);

  // A provider is "configured" when both clientId and clientSecret env vars are set
  const configured = !!(cfg?.clientId && cfg.clientSecret);

  // Also return the callback URL so the user can register it in their OAuth app
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const callbackUrl = `${appUrl}/api/integrations/${provider}/callback`;

  return NextResponse.json({ configured, callbackUrl });
}
