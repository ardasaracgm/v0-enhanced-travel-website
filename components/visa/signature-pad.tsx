'use client'

/**
 * SignaturePad — applicant's hand-drawn signature for the visa wizard.
 * ====================================================================
 * NOT a file upload: the user draws with mouse / finger / stylus on a canvas.
 * On confirm, the canvas is exported as an opaque-white PNG and pushed through
 * the SAME pipeline as DocumentUploadSlot (presign -> PUT to R2 -> confirm)
 * under doc_type 'applicant_signature', so the submit gate and the DB treat it
 * like any other required document.
 *
 * Why a large opaque canvas: the visa upload pipeline enforces a 50 KB minimum
 * (VISA_DOC_MIN_BYTES) to reject empty/truncated files. A small transparent
 * signature PNG would fall under that floor and be rejected. Rendering at
 * 1200x400 logical px, scaled by devicePixelRatio, on a solid white background
 * yields a PNG comfortably above 50 KB and crisp enough for the Greek port
 * authorities' printed paperwork.
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Eraser, PenLine } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { DocumentUploadSlotStatus } from '@/app/[locale]/visa/document-upload-slot'

// Logical canvas size (CSS px). Backing store is scaled by DPR for crispness.
const CANVAS_W = 1200
const CANVAS_H = 400
const DOC_TYPE = 'applicant_signature'
const PNG_FILENAME = 'applicant-signature.png'

async function putToR2(url: string, blob: Blob): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: blob,
  })
  if (!res.ok) throw new Error(`PUT failed: ${res.status}`)
}

interface SignaturePadProps {
  label: string
  isRequired: boolean
  ensureApplicationId: () => Promise<string>
  initialSigned?: boolean
  onStatusChange?: (status: DocumentUploadSlotStatus) => void
  onUploaded?: (filename: string) => void
}

export function SignaturePad({
  label,
  isRequired,
  ensureApplicationId,
  initialSigned,
  onStatusChange,
  onUploaded,
}: SignaturePadProps) {
  const t = useTranslations('visaPage.documents')
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const drawing = React.useRef(false)
  const dirtied = React.useRef(false)

  const [status, setStatus] = React.useState<DocumentUploadSlotStatus>(
    initialSigned ? 'uploaded' : 'idle',
  )
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    onStatusChange?.(status)
  }, [status, onStatusChange])

  const resetCanvas = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3))
    canvas.width = CANVAS_W * dpr
    canvas.height = CANVAS_H * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  React.useEffect(() => {
    resetCanvas()
  }, [resetCanvas])

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pointFromEvent(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    drawing.current = true
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pointFromEvent(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    dirtied.current = true
    if (status === 'uploaded') {
      setStatus('idle')
      onUploaded?.('')
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* capture may already be released */
    }
  }

  const handleClear = () => {
    resetCanvas()
    dirtied.current = false
    setError(null)
    if (status === 'uploaded') onUploaded?.('')
    setStatus('idle')
  }

  const handleConfirm = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!dirtied.current) {
      setError(t('signatureEmpty'))
      return
    }
    setError(null)
    setStatus('uploading')
    try {
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
          'image/png',
        ),
      )
      const applicationId = await ensureApplicationId()

      const presignRes = await fetch('/api/visa/documents/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          doc_type: DOC_TYPE,
          filename: PNG_FILENAME,
          mime_type: 'image/png',
          size: blob.size,
        }),
      })
      if (!presignRes.ok) throw new Error('presign failed')
      const { upload_url, r2_key } = (await presignRes.json()) as {
        upload_url: string
        r2_key: string
      }

      await putToR2(upload_url, blob)

      const confirmRes = await fetch('/api/visa/documents/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          doc_type: DOC_TYPE,
          r2_key,
          original_filename: PNG_FILENAME,
          mime_type: 'image/png',
          size_bytes: blob.size,
        }),
      })
      if (!confirmRes.ok) throw new Error('confirm failed')

      dirtied.current = false
      setStatus('uploaded')
      onUploaded?.(PNG_FILENAME)
    } catch {
      setStatus('error')
      setError(t('signatureError'))
    }
  }

  const isUploaded = status === 'uploaded'
  const isUploading = status === 'uploading'

  return (
    <Card className={`border-border/50 ${isUploaded ? 'border-primary/40' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary shrink-0" />
            {label}
          </CardTitle>
          {isRequired ? (
            <Badge variant="destructive">{t('badgeRequired')}</Badge>
          ) : (
            <Badge variant="secondary">{t('badgeOptional')}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{t('signatureHint')}</p>

        <div className="rounded-md border border-border bg-white">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="h-40 w-full touch-none rounded-md"
            style={{ touchAction: 'none' }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={isUploading}
            className="gap-1.5"
          >
            <Eraser className="h-4 w-4" />
            {t('signatureClear')}
          </Button>

          {isUploaded ? (
            <span className="flex items-center gap-1.5 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              {t('signatureSaved')}
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={isUploading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isUploading ? t('uploading') : t('signatureConfirm')}
            </Button>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
