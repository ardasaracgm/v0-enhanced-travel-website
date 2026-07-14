import type { Metadata } from 'next'
import Image from 'next/image'
import { AdminLoginForm } from './admin-login-form'

// Kisitli alan — arama motorlarina girmesin.
export const metadata: Metadata = {
  title: 'Admin sign-in',
  robots: { index: false, follow: false },
}

/**
 * /admin-login — sifreli admin girisi. Server component (metadata/noindex icin);
 * form client alt-bilesende (useActionState). Gorsel /login split-screen'den miras.
 * Admin arayuzu Ingilizce (i18n yok).
 */
export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen lg:h-screen lg:overflow-hidden lg:grid-cols-2">
      {/* SOL: frosted form */}
      <div className="relative flex items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 via-white to-white">
        <div className="w-full max-w-md">
          <AdminLoginForm />
        </div>
      </div>

      {/* SAG: hero (yalniz lg+) */}
      <div className="relative hidden lg:block">
        <Image src="/login-hero.webp" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/30 to-transparent" />
      </div>
    </main>
  )
}
