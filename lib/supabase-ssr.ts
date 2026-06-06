import 'server-only'

/**
 * TravelBeez · Hub · sunucu-taraflı auth-aware Supabase istemcisi
 * ==============================================================
 * RSC (server component) + route handler'larda OTURUMLU kullanıcı
 * okumak için. ANON key kullanır → RLS geçerli (kullanıcı kendi
 * profiles satırını görür). Service-role DEĞİL.
 *
 * Admin yazma (createTrip vb.) hâlâ lib/supabase-server.ts
 * (getSupabaseAdmin, service-role, RLS bypass) ile yapılır — bu dosya
 * onun yerini ALMAZ, yanında durur.
 *
 * Next 15: cookies() async → await zorunlu.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Component'ten setAll çağrıldı → yazma yasak; yut.
            // Oturum yenilemeyi middleware (updateSession) zaten yapıyor.
          }
        },
      },
    },
  )
}
