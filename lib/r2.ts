/**
 * Cloudflare R2 client (S3-compatible).
 * =====================================
 * Server-only. R2 speaks the S3 API, so we use the AWS S3 SDK pointed at the
 * R2 endpoint with region "auto". Credentials are R2 API tokens, NOT AWS keys.
 *
 * Two presigned-URL helpers:
 *   - getUploadUrl(key, contentType)  → presigned PUT, for the browser to push
 *     a file straight to R2 (the file never transits our server).
 *   - getDownloadUrl(key)             → presigned GET, short TTL, for admins to
 *     pull a stored document. Visa docs are PII — links must expire fast.
 *
 * The bucket is private; every read/write goes through a freshly-signed URL.
 *
 * Vercel env setup (mark R2_SECRET_ACCESS_KEY as "Sensitive"):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT,
 *   R2_VISA_BUCKET — see .env.example.
 */

import 'server-only'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const endpoint = process.env.R2_ENDPOINT
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucket = process.env.R2_VISA_BUCKET

// Presigned-URL lifetimes (seconds).
export const UPLOAD_URL_TTL_SECONDS = 5 * 60   // browser PUT window
export const DOWNLOAD_URL_TTL_SECONDS = 5 * 60 // admin GET window (PII — keep short)

/** Throw a single clear error naming every missing R2 var. */
function assertR2Env(): void {
  const missing = [
    !endpoint && 'R2_ENDPOINT',
    !accessKeyId && 'R2_ACCESS_KEY_ID',
    !secretAccessKey && 'R2_SECRET_ACCESS_KEY',
    !bucket && 'R2_VISA_BUCKET',
  ].filter(Boolean)
  if (missing.length) {
    throw new Error(
      `R2 is not configured. Missing env var(s): ${missing.join(', ')}. ` +
        'See .env.example and add them in Vercel → Settings → Environment Variables.',
    )
  }
}

// Singleton — one client per server instance is enough.
let cached: S3Client | null = null

function getR2Client(): S3Client {
  if (cached) return cached
  assertR2Env()
  cached = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  })
  return cached
}

/** The configured visa bucket name (asserts env is present). */
export function getVisaBucket(): string {
  assertR2Env()
  return bucket!
}

/**
 * Presigned PUT URL for a browser upload.
 * The client MUST send the exact same Content-Type header it signed with,
 * or R2 rejects the PUT with SignatureDoesNotMatch.
 */
export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: getVisaBucket(),
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS })
}

/**
 * Presigned GET URL for an admin download. Short TTL — these reference PII.
 */
export async function getDownloadUrl(key: string): Promise<string> {
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: getVisaBucket(),
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS })
}
