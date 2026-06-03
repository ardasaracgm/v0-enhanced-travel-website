'use client'

/**
 * DocumentUploadSlot — one self-contained visa document slot.
 * ===========================================================
 * Owns the full single-document lifecycle: client-side validate (size/MIME from
 * upload-constants) → presign (POST /api/visa/documents/presign) → PUT to R2
 * with an XHR progress bar → confirm (POST /api/visa/documents/confirm). It
 * holds its own status/filename/progress/error state and reports transitions up
 * via callbacks; it does NOT know about siblings, groups, or the submit gate.
 *
 * The application_id is fetched LAZILY: the slot calls `ensureApplicationId()`
 * on the first upload, not on mount. In the documents page that resolver just
 * hands back the known id; in the wizard it resolves to a freshly-created draft
 * (see lib/visa/use-draft-application). Re-upload reuses the same doc_type; the
 * confirm route flips the old row to 'replaced', so the UI just shows the new
 * filename.
 *
 * Extracted from documents-uploader.tsx (was the inline `DocSlot`) so the same
 * slot can be reused across the wizard steps.
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, CheckCircle2, FileText, Loader2, Upload } from 'lucide-react'

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
import {
  analyzeImageQuality,
  type ImageQualityWarning,
} from '@/lib/visa/image-quality-checks'
import type { ResolvedVisaDoc } from '@/lib/visa-documents'

// Quality-warning code → i18n key under visaPage.documents.
const QUALITY_WARNING_KEY: Record<ImageQualityWarning, string> = {
  corrupt: 'qualityCorrupt',
  lowResolution: 'qualityLowResolution',
  tooDark: 'qualityTooDark',
  blurry: 'qualityBlurry',
}

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

export type DocumentUploadSlotStatus = 'idle' | 'uploading' | 'uploaded' | 'error'

interface SlotState {
  status: DocumentUploadSlotStatus
  filename: string | null
  progress: number // 0-100
  error: string | null // already-localized message
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

interface DocumentUploadSlotProps {
  doc: ResolvedVisaDoc
  /** Resolves the application_id, creating a draft on demand (called on first upload). */
  ensureApplicationId: () => Promise<string>
  /** Filename to seed the slot in its uploaded state (slot reopened with an existing doc). */
  initialFilename?: string
  /** Fired on every status transition — lets a parent drive a submit gate. */
  onStatusChange?: (status: DocumentUploadSlotStatus) => void
  /** Convenience: fired only on a successful (re)upload, with the new filename. */
  onUploaded?: (filename: string) => void
}

export function DocumentUploadSlot({
  doc,
  ensureApplicationId,
  initialFilename,
  onStatusChange,
  onUploaded,
}: DocumentUploadSlotProps) {
  const t = useTranslations('visaPage.documents')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const [state, setState] = React.useState<SlotState>(() =>
    initialFilename
      ? { status: 'uploaded', filename: initialFilename, progress: 100, error: null }
      : { status: 'idle', filename: null, progress: 0, error: null },
  )

  // Advisory image-quality warnings for the picked file. Independent of the
  // upload lifecycle: they never block upload or the submit gate, and they
  // persist into the 'uploaded' state so the user still sees the nudge.
  const [warnings, setWarnings] = React.useState<ImageQualityWarning[]>([])

  // Report status transitions up (e.g. to recompute the parent's submit gate).
  React.useEffect(() => {
    onStatusChange?.(state.status)
  }, [state.status, onStatusChange])

  const handleFile = React.useCallback(
    async (file: File) => {
      // A fresh pick clears any stale advisory warnings from a prior file.
      setWarnings([])

      // 1. Client-side validation (server re-checks; this is just fast UX).
      if (!isAllowedVisaDocMime(file.type)) {
        setState({ status: 'error', filename: null, progress: 0, error: t('errType', { formats: FORMAT_LABEL }) })
        return
      }
      if (!isAllowedVisaDocSize(file.size)) {
        setState({ status: 'error', filename: null, progress: 0, error: t('errSize', { min: MIN_LABEL, max: MAX_LABEL }) })
        return
      }

      // Advisory image-quality pre-check. Runs in parallel with the upload and
      // only sets warnings — it never blocks or delays the upload below.
      void analyzeImageQuality(file).then(setWarnings)

      setState({ status: 'uploading', filename: file.name, progress: 0, error: null })

      try {
        // 2. Resolve the application_id (creates the draft on the first upload).
        const applicationId = await ensureApplicationId()

        // 3. Presign.
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

        // 4. PUT to R2 with progress.
        await putWithProgress(upload_url, file, (pct) =>
          setState((prev) => ({ ...prev, progress: pct })),
        )

        // 5. Confirm (records the row; replaces the previous one for this doc_type).
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

        setState({ status: 'uploaded', filename: file.name, progress: 100, error: null })
        onUploaded?.(file.name)
      } catch {
        setState({ status: 'error', filename: null, progress: 0, error: t('errUpload') })
      }
    },
    [doc.key, ensureApplicationId, onUploaded, t],
  )

  const isUploading = state.status === 'uploading'
  const isUploaded = state.status === 'uploaded'

  const pick = () => inputRef.current?.click()
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset value so re-selecting the same filename still fires onChange.
    e.target.value = ''
    if (file) handleFile(file)
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

        {/* Advisory quality warnings (amber, not red) — never a blocker. */}
        {warnings.length > 0 && (
          <ul className="space-y-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700/50 dark:bg-amber-950/30">
            {warnings.map((code) => (
              <li
                key={code}
                className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{t(QUALITY_WARNING_KEY[code])}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
