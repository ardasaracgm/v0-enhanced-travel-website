/**
 * Server-side Supabase client.
 * ============================
 * Uses the SERVICE_ROLE key, which bypasses RLS. This client must
 * NEVER be imported into client components — only into:
 *   - Server actions (`'use server'`)
 *   - Route handlers (app/api/*)
 *   - Server components (not interactive)
 *
 * The service role key has full read/write access to all tables.
 * Treat the env var SUPABASE_SERVICE_ROLE_KEY like a database password:
 *   - Never commit
 *   - Never expose to the browser
 *   - Rotate if accidentally leaked
 *
 * Vercel env setup:
 *   - Vercel Dashboard → Project → Settings → Environment Variables
 *   - Add: SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard → API)
 *   - Mark as "Sensitive"
 *   - Apply to: Production, Preview, Development
 */

import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
}
if (!serviceKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Server actions cannot write to Supabase without it. ' +
      'Add it in Vercel → Settings → Environment Variables.'
  )
}

// Singleton — one client per server instance is enough.
let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached
  cached = createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application': 'travelbeez-server' } },
  })
  return cached
}
