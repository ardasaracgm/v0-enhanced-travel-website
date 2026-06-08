import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getDownloadUrl } from '@/lib/r2'
import { Link } from '@/i18n/routing'
import { Badge } from '@/components/ui/badge'
import { updateVisaState } from '@/lib/actions/admin-update-visa-state'

export const dynamic = 'force-dynamic'

// Admin'in atayabileceği state'ler (action'daki ALLOWED_TARGETS ile hizalı).
const ADMIN_TARGETS = ['reviewed', 'approved', 'rejected'] as const

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value === null || value === '' ? '—' : value}</dd>
    </div>
  )
}

export default async function AdminVisaDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const supabase = getSupabaseAdmin()

  const { data: app } = await supabase
    .from('visa_applications')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!app) notFound()

  const { data: docs } = await supabase
    .from('visa_documents')
    .select('id, doc_type, original_filename, mime_type, size_bytes, r2_key, created_at')
    .eq('application_id', id)
    .eq('status', 'uploaded')
    .order('doc_type')

  // Her belge için kısa-TTL presigned GET (PII → kısa ömür).
  const docsWithUrls = await Promise.all(
    (docs ?? []).map(async (d) => ({
      ...d,
      openUrl: await getDownloadUrl(d.r2_key as string), // inline → tarayıcıda açar
      downloadUrl: await getDownloadUrl(d.r2_key as string, d.original_filename as string), // attachment → indirir
    })),
  )

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
            ← Visa Applications
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {app.first_name} {app.last_name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {app.state}
          </Badge>
          <a
            href={`/api/admin/visa/${id}/docx`}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Word indir
          </a>
        </div>
      </div>

      {/* State değiştirme — her hedef ayrı form; action kendi içinde is_admin doğrular */}
      <div className="rounded-md border bg-background p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Set state</p>
        <div className="flex flex-wrap gap-2">
          {ADMIN_TARGETS.map((target) => (
            <form key={target} action={updateVisaState}>
              <input type="hidden" name="id" value={app.id} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="target" value={target} />
              <button
                type="submit"
                disabled={app.state === target}
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-40"
              >
                {target}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Belgeler */}
      <section className="rounded-md border bg-background p-4">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Documents</h2>
        {docsWithUrls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <ul className="divide-y">
            {docsWithUrls.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{d.doc_type}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.original_filename}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <a
                    href={d.openUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Open
                  </a>
                  <a
                    href={d.downloadUrl}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Alanlar */}
      <section className="grid gap-6 md:grid-cols-2">
        <dl className="space-y-3 rounded-md border bg-background p-4">
          <h2 className="text-sm font-semibold text-foreground">Travel</h2>
          <Field label="Entry point" value={app.entry_point} />
          <Field label="Vessel" value={app.vessel_type} />
          <Field label="Purpose" value={app.travel_purpose} />
          <Field label="Stay (days)" value={app.stay_duration} />
          <Field label="Schengen last 3y" value={String(app.schengen_last_3_years)} />
          <Field label="Fingerprints taken" value={String(app.fingerprints_taken)} />
          <Field label="Schengen entry" value={app.schengen_entry_date} />
          <Field label="Schengen exit" value={app.schengen_exit_date} />
        </dl>

        <dl className="space-y-3 rounded-md border bg-background p-4">
          <h2 className="text-sm font-semibold text-foreground">Personal</h2>
          <Field label="First / Last" value={`${app.first_name} ${app.last_name}`} />
          <Field label="Father / Mother" value={`${app.father_name} / ${app.mother_name}`} />
          <Field label="Birth date" value={app.birth_date} />
          <Field label="Birth place / country" value={`${app.birth_place}, ${app.birth_country}`} />
          <Field label="Gender" value={app.gender} />
          <Field label="Marital status" value={app.marital_status} />
          <Field label="Occupation" value={app.occupation} />
        </dl>

        <dl className="space-y-3 rounded-md border bg-background p-4">
          <h2 className="text-sm font-semibold text-foreground">Document</h2>
          <Field label="ID number" value={app.id_number} />
          <Field label="Doc type" value={app.doc_type} />
          <Field label="Doc number" value={app.doc_number} />
          <Field label="Issue date" value={app.doc_issue_date} />
          <Field label="Expiry date" value={app.doc_expiry_date} />
          <Field label="Issuing authority" value={app.issuing_authority} />
        </dl>

        <dl className="space-y-3 rounded-md border bg-background p-4">
          <h2 className="text-sm font-semibold text-foreground">Contact & Meta</h2>
          <Field label="Email" value={app.email} />
          <Field label="Phone" value={app.phone} />
          <Field label="Residence address" value={app.residence_address} />
          <Field label="Lives in other country" value={String(app.lives_in_other_country)} />
          <Field label="Locale / source" value={`${app.locale} / ${app.source ?? '—'}`} />
          <Field label="Promo code" value={app.promo_code} />
          <Field label="Trip ID" value={app.trip_id} />
          <Field label="Created" value={new Date(app.created_at).toLocaleString('en-GB')} />
        </dl>
      </section>
    </div>
  )
}
