// ── IntegrationOAuth ──────────────────────────────────────────────────────────
// Builds OAuth 2.0 redirect URLs and exchanges auth codes for tokens for each
// supported CRM provider. These functions are called by the connect/callback
// API routes under /api/integrations/[provider]/.
//
// Each provider requires env vars (Client ID + Secret) registered in the
// provider's developer console. See Env.ts for the full list.
// ─────────────────────────────────────────────────────────────────────────────

import { Env } from '@/libs/Env';

// Base URL of this app — used to build the OAuth callback URL
const APP_URL = Env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// ── Provider config ───────────────────────────────────────────────────────────

type ProviderConfig = {
  authUrl: string;
  tokenUrl: string;
  scopes: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
};

/**
 * Returns OAuth provider configuration for the given provider name.
 * Returns null if the provider is unknown or credentials are not configured.
 *
 * @param provider - One of 'hubspot' | 'salesforce' | 'pipedrive' | 'zoho' | 'googlesheets'.
 * @returns Provider config object or null for unknown providers.
 */
export function getProviderConfig(provider: string): ProviderConfig | null {
  // Map of supported providers to their OAuth endpoints and scopes
  const configs: Record<string, ProviderConfig> = {
    hubspot: {
      authUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
      scopes: 'crm.objects.contacts.read crm.objects.contacts.write',
      clientId: Env.HUBSPOT_CLIENT_ID,
      clientSecret: Env.HUBSPOT_CLIENT_SECRET,
    },
    salesforce: {
      authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      scopes: 'api refresh_token offline_access',
      clientId: Env.SALESFORCE_CLIENT_ID,
      clientSecret: Env.SALESFORCE_CLIENT_SECRET,
    },
    pipedrive: {
      authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
      tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
      scopes: 'contacts:full deals:full',
      clientId: Env.PIPEDRIVE_CLIENT_ID,
      clientSecret: Env.PIPEDRIVE_CLIENT_SECRET,
    },
    zoho: {
      authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
      tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
      scopes: 'ZohoCRM.modules.contacts.ALL ZohoCRM.modules.leads.ALL',
      clientId: Env.ZOHO_CLIENT_ID,
      clientSecret: Env.ZOHO_CLIENT_SECRET,
    },
    googlesheets: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
      clientId: Env.GOOGLE_SHEETS_CLIENT_ID,
      clientSecret: Env.GOOGLE_SHEETS_CLIENT_SECRET,
    },
  };

  return configs[provider] ?? null;
}

/**
 * Builds the OAuth redirect URL to send the user to for authorization.
 *
 * @param provider - The integration provider name.
 * @param state - Random state string for CSRF protection.
 * @returns The full authorization URL or null if credentials are missing.
 */
export function buildAuthUrl(provider: string, state: string): string | null {
  const cfg = getProviderConfig(provider);

  // Return null if provider is unknown or clientId is not configured
  if (!cfg || !cfg.clientId) return null;

  // Callback URL — must be registered in the provider's app settings
  const redirectUri = `${APP_URL}/api/integrations/${provider}/callback`;

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    scope: cfg.scopes,
    response_type: 'code',
    state,
    // Offline access — needed for refresh tokens
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${cfg.authUrl}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access + refresh tokens.
 *
 * @param provider - The integration provider name.
 * @param code - The authorization code from the OAuth callback.
 * @returns Token response object or null on failure.
 */
export async function exchangeCode(
  provider: string,
  code: string,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  instance_url?: string; // Salesforce returns this
} | null> {
  const cfg = getProviderConfig(provider);

  // Return null if credentials are not configured
  if (!cfg || !cfg.clientId || !cfg.clientSecret) return null;

  const redirectUri = `${APP_URL}/api/integrations/${provider}/callback`;

  // Build the token exchange request body (form-encoded as per OAuth 2.0 spec)
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });

  try {
    const res = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[oauth] Token exchange failed for ${provider}:`, text);
      return null;
    }

    return await res.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      instance_url?: string;
    };
  } catch (err) {
    console.error(`[oauth] Token exchange error for ${provider}:`, err);
    return null;
  }
}
