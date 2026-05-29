import 'server-only'

// Base URLs differ between demo and live environments.
// Switch with VIVA_ENV=demo (default) | live.

interface VivaConfig {
  authUrl:      string
  apiBase:      string
  checkoutBase: string
}

interface CachedToken {
  accessToken: string
  expiresAt:   number  // ms since epoch
}

// Module-level cache: persists across requests within the same server process.
// Each serverless cold start begins with null — one token fetch per warm instance.
let tokenCache: CachedToken | null = null
// In-flight dedup: if two requests arrive simultaneously with an expired cache,
// both await the same fetch rather than issuing two parallel OAuth requests.
let tokenFetch: Promise<string> | null = null

export function getVivaConfig(): VivaConfig {
  if (process.env.VIVA_ENV === 'live') {
    return {
      authUrl:      'https://accounts.vivapayments.com/connect/token',
      apiBase:      'https://api.vivapayments.com',
      checkoutBase: 'https://www.vivapayments.com',
    }
  }
  return {
    authUrl:      'https://demo-accounts.vivapayments.com/connect/token',
    apiBase:      'https://demo-api.vivapayments.com',
    checkoutBase: 'https://demo.vivapayments.com',
  }
}

async function fetchAccessToken(): Promise<string> {
  const clientId     = process.env.VIVA_CLIENT_ID
  const clientSecret = process.env.VIVA_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('[viva] Missing VIVA_CLIENT_ID or VIVA_CLIENT_SECRET')
  }

  const { authUrl } = getVivaConfig()

  const res = await fetch(authUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[viva] OAuth token request failed: HTTP ${res.status} — ${body}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }

  // Cache with 60-second buffer so we never present an about-to-expire token
  tokenCache = {
    accessToken: data.access_token,
    expiresAt:   Date.now() + (data.expires_in - 60) * 1000,
  }

  return data.access_token
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken
  }
  if (!tokenFetch) {
    tokenFetch = fetchAccessToken().finally(() => { tokenFetch = null })
  }
  return tokenFetch
}

/** Build the Viva Smart Checkout redirect URL for a given orderCode. */
export function getVivaCheckoutUrl(orderCode: string): string {
  return `${getVivaConfig().checkoutBase}/web/checkout?ref=${orderCode}`
}

/**
 * Make an authenticated request to the Viva API.
 * Obtains/reuses a cached OAuth2 bearer token automatically.
 */
export async function vivaRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const { apiBase } = getVivaConfig()
  const token = await getAccessToken()

  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`[viva] ${method} ${path} → HTTP ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

/**
 * Fetch the webhook verification key from Viva.
 *
 * Viva's webhook handshake is NOT a static secret. When Viva registers or
 * periodically re-checks a webhook URL, it issues a GET; we must answer with a
 * key fetched live from Viva's token endpoint using BASIC auth —
 * base64(`${MerchantID}:${APIKey}`) — echoed back as { "Key": "<value>" }.
 *
 * This is a DIFFERENT auth scheme than the OAuth client-credentials flow used
 * by vivaRequest(); do NOT route it through getAccessToken().
 *
 * Host follows the same VIVA_ENV switch as getVivaConfig():
 *   demo → https://demo-api.vivapayments.com/api/messages/config/token
 *   live → https://api.vivapayments.com/api/messages/config/token
 */
export async function fetchWebhookVerificationKey(): Promise<string> {
  const merchantId = process.env.VIVA_MERCHANT_ID
  const apiKey     = process.env.VIVA_API_KEY

  if (!merchantId || !apiKey) {
    throw new Error('[viva] Missing VIVA_MERCHANT_ID or VIVA_API_KEY')
  }

  const { apiBase } = getVivaConfig()
  const credentials = Buffer.from(`${merchantId}:${apiKey}`).toString('base64')

  const res = await fetch(`${apiBase}/api/messages/config/token`, {
    method:  'GET',
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept:        'application/json',
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[viva] Webhook key request failed: HTTP ${res.status} — ${body}`)
  }

  const data = await res.json() as { Key: string }
  return data.Key
}
