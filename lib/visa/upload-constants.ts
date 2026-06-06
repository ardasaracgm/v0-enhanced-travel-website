/**
 * Visa document upload — shared constants & helpers.
 * ==================================================
 * Single source of truth for the size/MIME limits enforced by BOTH the presign
 * route (before signing a PUT) and the confirm route (defence-in-depth). The
 * presign-issued URL is just an opaque token — R2 does NOT enforce our size or
 * type rules, so these checks are the only gate.
 *
 * Vize-2 step 4 will pull these into the per-doc-type config engine
 * (lib/visa-documents.ts); until then they are global defaults.
 *
 * Safe to import on the client (no server-only deps) if a wizard wants to
 * pre-validate before requesting a presign — but the SERVER checks are
 * authoritative.
 */

// --- Size bounds (bytes) ---
export const VISA_DOC_MIN_BYTES = 50 * 1024 // 50 KB — reject empty / truncated files
export const VISA_DOC_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
// The applicant signature is a canvas-drawn PNG, not a photo/scan. A sparse
// signature on an opaque-white 1200x400 canvas can come in under the 50 KB
// document floor (observed ~46 KB). It gets its own, much lower minimum; the
// SignaturePad already rejects a blank canvas, so this only catches a truly
// degenerate/truncated upload.
export const VISA_SIGNATURE_MIN_BYTES = 2 * 1024 // 2 KB

// --- Allowed content types ---
export const VISA_DOC_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const
export type VisaDocMimeType = (typeof VISA_DOC_ALLOWED_MIME_TYPES)[number]

export function isAllowedVisaDocMime(mime: string): mime is VisaDocMimeType {
  return (VISA_DOC_ALLOWED_MIME_TYPES as readonly string[]).includes(mime)
}

export function isAllowedVisaDocSize(
  sizeBytes: number,
  minBytes: number = VISA_DOC_MIN_BYTES,
): boolean {
  return (
    Number.isFinite(sizeBytes) &&
    sizeBytes >= minBytes &&
    sizeBytes <= VISA_DOC_MAX_BYTES
  )
}

/**
 * Collapse a user-supplied filename to a safe, R2-key-friendly token.
 * Keeps the extension, strips paths, replaces anything non-alphanumeric/dot/dash
 * with "-", and caps length. NEVER trust the raw client filename in a key.
 */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? 'file'
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return (cleaned || 'file').slice(0, 100)
}

/**
 * Build the canonical R2 object key for a visa document:
 *   visa/{applicationId}/{docType}/{uuid}-{sanitizedFilename}
 * The uuid guarantees uniqueness so re-uploads never collide.
 */
export function buildVisaDocKey(
  applicationId: string,
  docType: string,
  filename: string,
): string {
  const uuid = crypto.randomUUID()
  const safeDocType = docType.replace(/[^a-zA-Z0-9_\-]+/g, '-')
  return `visa/${applicationId}/${safeDocType}/${uuid}-${sanitizeFilename(filename)}`
}
