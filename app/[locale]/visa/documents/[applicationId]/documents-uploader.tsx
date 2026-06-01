'use client'

/**
 * Visa documents uploader (Vize-2, step 4 — parts 1+2+3).
 *
 * Per slot: client-side validate (size/MIME from upload-constants) → presign
 * (POST /api/visa/documents/presign) → PUT to R2 with an XHR progress bar →
 * confirm (POST /api/visa/documents/confirm). Re-upload reuses the same
 * doc_type; the confirm route flips the old row to 'replaced' server-side, so
 * the UI just shows the new filename.
 *
 * Slots reopen filled from `initialUploaded` (the page reads status='uploaded'
 * rows). The submit gate + wizard redirect are parts 4+5 — submit stays
 * disabled here, but the required-uploaded summary is already live.
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, FileText, Loader2, Upload } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

import {
  isAllowedVisaDocMime,
  isAllowedVisaDocSize,
  VISA_DOC_ALLOWED_MIME_TYPES,
  VISA_DOC_MAX_BYTES,
  VISA_DOC_MIN_BYTES,
} from '@/lib/visa/upload-constants'
import type { ResolvedVisaDoc } from '@/lib/visa-documents'

// MIME → human extension, for the accepted-formats hint + error.
const MIME_EXT: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
}
const FORMAT_LABEL = VISA_DOC_ALLOWED_MIME_TYPES.map((m) => MIME_EXT[m] ?? m).join(', ')

/** Bytes → compact human size (e.g. 51200 → "50 KB", 10485760 → "10 MB"). */
function humanBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`
  return `${Math.round(bytes / 1024)} KB`
}
const MIN_LABEL = humanBytes(VISA_DOC_MIN_BYTES)
const MAX_LABEL = humanBytes(VISA_DOC_MAX_BYTES)
const ACCEPT_ATTR = VISA_DOC_ALLOWED_MIME_TYPES.join(',')

// ============================================================
// Per-slot state
// ============================================================
type SlotStatus = 'idle' | 'uploading' | 'uploaded' | 'error'

interface SlotState {
  status: SlotStatus
  filename: string | null
  progress: number // 0-100
  error: string | null // already-localized message
}

const IDLE: SlotState = { status: 'idle', filename: null, progress: 0, error: null }

interface VisaDocumentsUploaderProps {
  applicationId: string
  documents: ResolvedVisaDoc[]
  initialUploaded?: Record<string, { filename: string }>
}

/** PUT a file to a presigned URL with upload progress (fetch has no progress). */
function putWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    // MUST match the Content-Type the URL was signed with (mime_type).
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`PUT failed: ${xhr.status}`))
    xhr.onerror = () => reject(new Error('PUT network error'))
    xhr.send(file)
  })
}

export function VisaDocumentsUploader({
  applicationId,
  documents,
  initialUploaded = {},
}: VisaDocumentsUploaderProps) {
  const t = useTranslations('visaPage.documents')

  // Seed slot state from already-uploaded docs.
  const [slots, setSlots] = React.useState<Record<string, SlotState>>(() => {
    const seed: Record<string, SlotState> = {}
    for (const doc of documents) {
      const existing = initialUploaded[doc.key]
      seed[doc.key] = existing
        ? { status: 'uploaded', filename: existing.filename, progress: 100, error: null }
        : { ...IDLE }
    }
    return seed
  })

  const patchSlot = React.useCallback((key: string, patch: Partial<SlotState>) => {
    setSlots((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }, [])

  const handleFile = React.useCallback(
    async (doc: ResolvedVisaDoc, file: File) => {
      // 1. Client-side validation (server re-checks; this is just fast UX).
      if (!isAllowedVisaDocMime(file.type)) {
        patchSlot(doc.key, { status: 'error', error: t('errType', { formats: FORMAT_LABEL }) })
        return
      }
      if (!isAllowedVisaDocSize(file.size)) {
        patchSlot(doc.key, { status: 'error', error: t('errSize', { min: MIN_LABEL, max: MAX_LABEL }) })
        return
      }

      patchSlot(doc.key, { status: 'uploading', progress: 0, error: null, filename: file.name })

      try {
        // 2. Presign.
        const presignRes = await fetch('/api/visa/documents/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_id: applicationId,
            doc_type: doc.key,
            filename: file.name,
            mime_type: file.type,
            size: file.size,
          }),
        })
        if (!presignRes.ok) throw new Error('presign failed')
        const { upload_url, r2_key } = (await presignRes.json()) as {
          upload_url: string
          r2_key: string
        }

        // 3. PUT to R2 with progress.
        await putWithProgress(upload_url, file, (pct) => patchSlot(doc.key, { progress: pct }))

        // 4. Confirm (records the row; replaces the previous one for this doc_type).
        const confirmRes = await fetch('/api/visa/documents/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_id: applicationId,
            doc_type: doc.key,
            r2_key,
            original_filename: file.name,
            mime_type: file.type,
            size_bytes: file.size,
          }),
        })
        if (!confirmRes.ok) throw new Error('confirm failed')

        patchSlot(doc.key, { status: 'uploaded', progress: 100, filename: file.name, error: null })
      } catch {
        patchSlot(doc.key, { status: 'error', error: t('errUpload') })
      }
    },
    [applicationId, patchSlot, t],
  )

  const required = documents.filter((d) => d.isRequired)
  const optional = documents.filter((d) => !d.isRequired)
  const uploadedRequiredCount = required.filter((d) => slots[d.key]?.status === 'uploaded').length
  const allRequiredUploaded = required.every((d) => slots[d.key]?.status === 'uploaded')
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
            <DocSlot key={doc.key} doc={doc} state={slots[doc.key]} onFile={handleFile} />
          ))}
        </DocGroup>
      )}

      {optional.length > 0 && (
        <DocGroup title={t('optionalGroup')}>
          {optional.map((doc) => (
            <DocSlot key={doc.key} doc={doc} state={slots[doc.key]} onFile={handleFile} />
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

function DocSlot({
  doc,
  state,
  onFile,
}: {
  doc: ResolvedVisaDoc
  state: SlotState
  onFile: (doc: ResolvedVisaDoc, file: File) => void
}) {
  const t = useTranslations('visaPage.documents')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const isUploading = state.status === 'uploading'
  const isUploaded = state.status === 'uploaded'

  const pick = () => inputRef.current?.click()
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset value so re-selecting the same filename still fires onChange.
    e.target.value = ''
    if (file) onFile(doc, file)
  }

  return (
    <Card className={`border-border/50 ${isUploaded ? 'border-primary/40' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            {doc.label}
          </CardTitle>
          {doc.isRequired ? (
            <Badge variant="destructive">{t('badgeRequired')}</Badge>
          ) : (
            <Badge variant="secondary">{t('badgeOptional')}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={onChange}
          disabled={isUploading}
        />

        {isUploaded ? (
          // Uploaded state — filename + green tick + "Change".
          <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="flex items-center gap-2 text-sm text-foreground min-w-0">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{state.filename}</span>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={pick}>
              {t('change')}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={pick}
            disabled={isUploading}
            className="w-full justify-start gap-2"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? t('uploading') : t('selectFile')}
          </Button>
        )}

        {isUploading && <Progress value={state.progress} className="h-2" />}

        {state.error ? (
          <p className="text-xs text-destructive">{state.error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t('formatHint', { formats: FORMAT_LABEL, min: MIN_LABEL, max: MAX_LABEL })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
