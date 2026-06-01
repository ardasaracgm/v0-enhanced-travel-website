/**
 * Visa document upload page (Vize-2, step 4 — SKELETON ONLY).
 * ==========================================================
 * Shown after a Vize-1 application is submitted. Addressed by application id:
 *   /[locale]/visa/documents/[applicationId]
 *
 * Server component: reads the application with the service-role client (the
 * row is PII, RLS-locked — no anon read) and resolves the required document
 * catalogue for THIS applicant (age / funding source / vessel drive which docs
 * are required). The resolved slots are handed to a client component for render.
 *
 * This step renders the slots ONLY. The upload flow (presign → PUT → confirm)
 * is wired in the next step; the file inputs and submit button are disabled.
 */

import { notFound } from 'next/navigation'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { resolveDocuments, type VisaApplicationForDocs } from '@/lib/visa-documents'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { VisaDocumentsUploader } from './documents-uploader'

// Per-application service-role read — never statically rendered/cached.
export const dynamic = 'force-dynamic'

export default async function VisaDocumentsPage({
  params,
}: {
  params: Promise<{ locale: string; applicationId: string }>
}) {
  const { locale, applicationId } = await params

  const supabase = getSupabaseAdmin()
  const { data: app, error } = await supabase
    .from('visa_applications')
    .select('id, birth_date, vessel_type, metadata')
    .eq('id', applicationId)
    .maybeSingle()

  // Unknown / non-existent application → 404 (also covers a malformed uuid,
  // which surfaces as a query error rather than an empty result).
  if (error || !app) notFound()

  // Already-uploaded documents for this application (status='uploaded' is the
  // single current file per doc_type). Lets the page reopen with slots filled.
  const { data: existing } = await supabase
    .from('visa_documents')
    .select('doc_type, original_filename')
    .eq('application_id', applicationId)
    .eq('status', 'uploaded')

  const initialUploaded: Record<string, { filename: string }> = {}
  for (const row of existing ?? []) {
    initialUploaded[row.doc_type] = { filename: row.original_filename }
  }

  // resolveDocuments speaks 'tr' | 'el'; the form is TR-primary and everything
  // else falls back to the English ('el') labels — including the 'en' UI.
  const docLocale = locale === 'tr' ? 'tr' : 'el'
  const documents = resolveDocuments(app as VisaApplicationForDocs, docLocale)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <VisaDocumentsUploader
              applicationId={applicationId}
              documents={documents}
              initialUploaded={initialUploaded}
            />
          </div>
        </section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
