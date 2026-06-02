'use client'

/**
 * Visa documents uploader (Vize-2, step 4 — parts 1+2+3).
 *
 * Renders a DocumentUploadSlot per resolved document and gates a final submit on
 * all required docs being uploaded. The per-slot upload mechanics (presign → PUT
 * → confirm) now live in DocumentUploadSlot; this component only orchestrates the
 * groups, tracks each slot's status for the gate, and owns the submit call.
 *
 * Slots reopen filled from `initialUploaded` (the page reads status='uploaded'
 * rows). Here the application_id is already known (it's the route param), so the
 * slot's lazy resolver just hands it straight back. The submit gate + wizard
 * redirect are parts 4+5 — submit stays disabled here, but the required-uploaded
 * summary is already live.
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import type { ResolvedVisaDoc } from '@/lib/visa-documents'
import {
  DocumentUploadSlot,
  type DocumentUploadSlotStatus,
} from '@/app/[locale]/visa/document-upload-slot'

interface VisaDocumentsUploaderProps {
  applicationId: string
  documents: ResolvedVisaDoc[]
  initialUploaded?: Record<string, { filename: string }>
}

export function VisaDocumentsUploader({
  applicationId,
  documents,
  initialUploaded = {},
}: VisaDocumentsUploaderProps) {
  const t = useTranslations('visaPage.documents')

  // The id is already known here; hand it straight back to every slot.
  const ensureApplicationId = React.useCallback(
    () => Promise.resolve(applicationId),
    [applicationId],
  )

  // Track each slot's status to drive the submit gate. Seed from already-uploaded docs.
  const [statuses, setStatuses] = React.useState<Record<string, DocumentUploadSlotStatus>>(() => {
    const seed: Record<string, DocumentUploadSlotStatus> = {}
    for (const doc of documents) {
      seed[doc.key] = initialUploaded[doc.key] ? 'uploaded' : 'idle'
    }
    return seed
  })

  const handleStatusChange = React.useCallback((key: string, status: DocumentUploadSlotStatus) => {
    setStatuses((prev) => (prev[key] === status ? prev : { ...prev, [key]: status }))
  }, [])

  const required = documents.filter((d) => d.isRequired)
  const optional = documents.filter((d) => !d.isRequired)
  const uploadedRequiredCount = required.filter((d) => statuses[d.key] === 'uploaded').length
  const allRequiredUploaded = required.every((d) => statuses[d.key] === 'uploaded')
  const missingCount = required.length - uploadedRequiredCount

  // ----- Submit (gate is UX; the route re-verifies required docs server-side) -----
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [submitError, setSubmitError] = React.useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(false)
    try {
      const res = await fetch('/api/visa/documents/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId }),
      })
      if (res.ok) setSubmitted(true)
      else setSubmitError(true)
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ----- Success screen -----
  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto border-primary/30">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">{t('successTitle')}</h3>
          <p className="text-muted-foreground">{t('successBody')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t('title')}</h1>
        <p className="text-muted-foreground text-lg">{t('subtitle')}</p>
      </div>

      {required.length > 0 && (
        <DocGroup title={t('requiredGroup')}>
          {required.map((doc) => (
            <DocumentUploadSlot
              key={doc.key}
              doc={doc}
              ensureApplicationId={ensureApplicationId}
              initialFilename={initialUploaded[doc.key]?.filename}
              onStatusChange={(status) => handleStatusChange(doc.key, status)}
            />
          ))}
        </DocGroup>
      )}

      {optional.length > 0 && (
        <DocGroup title={t('optionalGroup')}>
          {optional.map((doc) => (
            <DocumentUploadSlot
              key={doc.key}
              doc={doc}
              ensureApplicationId={ensureApplicationId}
              initialFilename={initialUploaded[doc.key]?.filename}
              onStatusChange={(status) => handleStatusChange(doc.key, status)}
            />
          ))}
        </DocGroup>
      )}

      {/* Summary + submit gate */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/50 pt-6">
        <div className="space-y-1 text-center sm:text-left">
          <p className="text-sm text-muted-foreground">
            {t('summary', { uploaded: uploadedRequiredCount, total: required.length })}
          </p>
          {missingCount > 0 && (
            <p className="text-sm text-amber-600">{t('missingWarning', { count: missingCount })}</p>
          )}
          {submitError && <p className="text-sm text-destructive">{t('submitError')}</p>}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!allRequiredUploaded || submitting}
          className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('submitting')}
            </>
          ) : (
            t('submit')
          )}
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Subcomponents
// ============================================================

function DocGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
