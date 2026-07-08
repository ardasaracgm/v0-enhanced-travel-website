import { notFound } from 'next/navigation'
import { Link, redirect } from '@/i18n/routing'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getMyVisaApplicationById } from '@/lib/hub/get-my-visa-applications'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

const STATE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'outline',
  in_progress: 'secondary',
  pending_payment: 'outline',
  reviewed: 'default',
  approved: 'default',
  rejected: 'destructive',
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value || '—'}</dd>
    </div>
  )
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</dl>
    </div>
  )
}

// 🔐 id URL'den gelir AMA email YALNIZ oturumdan; helper'daki sahiplik kapısı
// (email eşleşmezse null) IDOR'un tek bariyeri. null → notFound (varlık sızdırma yok).
export default async function HubVisaDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect({ href: '/hub', locale })
    return null
  }

  // Email YALNIZCA doğrulanmış oturumdan; id ile birlikte helper sahipliği doğrular.
  const detail = await getMyVisaApplicationById(id, user.email ?? '')
  if (!detail) notFound()

  const { application: a, documents, payment } = detail

  return (
    <div className="space-y-6">
            <div>
              <Link href="/hub/visa" className="text-sm text-muted-foreground hover:underline">
                ← Visa Applications
              </Link>
              <div className="mt-1 flex items-center justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {a.firstName} {a.lastName}
                </h1>
                <Badge variant={STATE_VARIANT[a.state] ?? 'outline'}>{a.state}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleDateString('en-GB')}
                {payment ? ` · Payment: ${payment.tripState}` : ''}
              </p>
            </div>

            <FieldGroup title="Travel">
              <Field label="Entry point" value={a.entryPoint} />
              <Field label="Vessel type" value={a.vesselType} />
              <Field label="Purpose" value={a.travelPurpose} />
              <Field label="Stay duration (days)" value={a.stayDuration} />
              <Field label="Schengen (last 3 years)" value={a.schengenLast3Years ? 'Yes' : 'No'} />
              <Field label="Fingerprints taken" value={a.fingerprintsTaken ? 'Yes' : 'No'} />
              <Field label="Entry date" value={a.schengenEntryDate} />
              <Field label="Exit date" value={a.schengenExitDate} />
            </FieldGroup>

            <FieldGroup title="Personal">
              <Field label="First name" value={a.firstName} />
              <Field label="Last name" value={a.lastName} />
              <Field label="Father's name" value={a.fatherName} />
              <Field label="Mother's name" value={a.motherName} />
              <Field label="Birth date" value={a.birthDate} />
              <Field label="Birth place" value={a.birthPlace} />
              <Field label="Birth country" value={a.birthCountry} />
              <Field label="Gender" value={a.gender} />
              <Field label="Marital status" value={a.maritalStatus} />
              <Field label="Occupation" value={a.occupation} />
            </FieldGroup>

            <FieldGroup title="Document">
              <Field label="ID number" value={a.idNumber} />
              <Field label="Document type" value={a.docType} />
              <Field label="Document number" value={a.docNumber} />
              <Field label="Issue date" value={a.docIssueDate} />
              <Field label="Expiry date" value={a.docExpiryDate} />
              <Field label="Issuing authority" value={a.issuingAuthority} />
            </FieldGroup>

            <FieldGroup title="Contact">
              <Field label="Residence address" value={a.residenceAddress} />
              <Field label="Phone" value={a.phone} />
              <Field label="Lives in another country" value={a.livesInOtherCountry ? 'Yes' : 'No'} />
            </FieldGroup>

            <div className="rounded-md border bg-background p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Documents</h2>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((d) => (
                    <li
                      key={`${d.docType}-${d.filename}`}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{d.docType}</p>
                        <p className="truncate text-xs text-muted-foreground">{d.filename}</p>
                      </div>
                      <div className="flex shrink-0 gap-3">
                        <a
                          href={d.openUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          Open
                        </a>
                        <a href={d.downloadUrl} className="font-medium text-primary hover:underline">
                          Download
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
    </div>
  )
}
