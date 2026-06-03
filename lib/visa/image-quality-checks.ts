/**
 * Visa document image quality pre-check (Seviye 1) — client-only, advisory.
 * ========================================================================
 * Lightweight, zero-dependency heuristics that run when a user PICKS an image
 * document (JPG/PNG), before/parallel to the upload. They produce *warnings*
 * only — they NEVER block selection, upload, or the submit gate. The goal is to
 * nudge the user toward a more readable scan, not to gate-keep.
 *
 * Everything is computed with the Canvas API + plain pixel math on a downscaled
 * sample (no OpenCV / WASM). PDFs are skipped entirely: a PDF is not an image,
 * so it cannot be decoded onto a canvas without rasterising it first.
 *
 * Thresholds live in IMAGE_QUALITY_THRESHOLDS below so they are trivial to tune.
 * They are deliberately CONSERVATIVE — a normal modern phone photo must not trip
 * a warning. Blur detection is the most fragile signal, so its bar is set so it
 * only fires on clearly soft images; when in doubt, stay silent.
 */

// ---------------------------------------------------------------------------
// Tunable thresholds — adjust here, nowhere else.
// ---------------------------------------------------------------------------
export const IMAGE_QUALITY_THRESHOLDS = {
  /**
   * Low-resolution: warn only if the image is below BOTH a minimum side and a
   * minimum total megapixel count, so a long-thin scan isn't punished. A modern
   * phone photo (e.g. 3000×4000 ≈ 12 MP) is far above this.
   */
  minWidth: 600,
  minHeight: 400,
  minMegapixels: 0.3, // ~ 670×450

  /**
   * Too dark: mean luminance (0–255) below this. A document photo in normal
   * light averages well above 100; 40 only catches genuinely under-exposed /
   * near-black images.
   */
  minMeanLuminance: 40,

  /**
   * Blurry: variance of the Laplacian on the luminance channel. Downscaling
   * itself softens an image and lowers this number, so the bar is intentionally
   * low — it should fire only on clearly out-of-focus shots. Tune cautiously.
   * Currently DISABLED (see enableBlurCheck) until the threshold is validated
   * against real photos — it is the most false-positive-prone signal.
   */
  minLaplacianVariance: 18,
  enableBlurCheck: false,

  /** Longest side (px) of the downscaled sample used for luminance + sharpness. */
  sampleSize: 128,
} as const

/**
 * Dev-only: log measured metrics so thresholds can be tuned against real files.
 * Strictly `=== 'development'` (not `!== 'production'`) so a filename (PII) is
 * never logged to a real user's console in any non-dev build.
 */
const DEBUG_QUALITY_METRICS = process.env.NODE_ENV === 'development'

export type ImageQualityWarning = 'corrupt' | 'lowResolution' | 'tooDark' | 'blurry'

/** Only raster image types are analysable; everything else (PDF) is skipped. */
const ANALYSABLE_MIME = new Set(['image/jpeg', 'image/png'])

export function isAnalysableImage(mime: string): boolean {
  return ANALYSABLE_MIME.has(mime)
}

/** Decode a File into an HTMLImageElement, or null if it cannot be decoded. */
function decodeImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/** Mean luminance + Laplacian variance from a downscaled ImageData sample. */
function computeLuminanceStats(data: Uint8ClampedArray, w: number, h: number) {
  // Per-pixel luminance (Rec. 601). One pass to build the grayscale grid.
  const lum = new Float64Array(w * h)
  let sum = 0
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    lum[p] = l
    sum += l
  }
  const meanLuminance = sum / (w * h)

  // Laplacian (4-neighbour) variance over interior pixels — a sharpness proxy.
  // Needs at least a 3×3 grid; if the sample is degenerate, report "sharp".
  if (w < 3 || h < 3) return { meanLuminance, laplacianVariance: Number.POSITIVE_INFINITY }

  let lapSum = 0
  let lapSqSum = 0
  let count = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      const lap = 4 * lum[idx] - lum[idx - 1] - lum[idx + 1] - lum[idx - w] - lum[idx + w]
      lapSum += lap
      lapSqSum += lap * lap
      count++
    }
  }
  const lapMean = lapSum / count
  const laplacianVariance = lapSqSum / count - lapMean * lapMean

  return { meanLuminance, laplacianVariance }
}

/**
 * Analyse a picked image file and return any advisory quality warnings.
 * - Non-image (PDF) files return [] (skipped).
 * - A file that won't decode, or has zero dimensions, returns ['corrupt'].
 * - Otherwise returns 0..N of: 'lowResolution' | 'tooDark' | 'blurry'.
 * Never throws — on any unexpected failure it returns [] (fail open / silent).
 */
export async function analyzeImageQuality(file: File): Promise<ImageQualityWarning[]> {
  if (!isAnalysableImage(file.type)) return []

  try {
    const img = await decodeImage(file)
    if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) {
      return ['corrupt']
    }

    const warnings: ImageQualityWarning[] = []
    const {
      minWidth,
      minHeight,
      minMegapixels,
      minMeanLuminance,
      minLaplacianVariance,
      enableBlurCheck,
      sampleSize,
    } = IMAGE_QUALITY_THRESHOLDS

    const w = img.naturalWidth
    const h = img.naturalHeight

    // Resolution — below the side minimums AND below the megapixel floor.
    const megapixels = (w * h) / 1_000_000
    if (w < minWidth && h < minHeight && megapixels < minMegapixels) {
      warnings.push('lowResolution')
    }

    // Downscale once for the pixel-level checks (luminance + sharpness).
    const scale = Math.min(1, sampleSize / Math.max(w, h))
    const sw = Math.max(1, Math.round(w * scale))
    const sh = Math.max(1, Math.round(h * scale))

    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return warnings // can't sample pixels; keep any resolution warning.

    ctx.drawImage(img, 0, 0, sw, sh)
    let pixels: ImageData
    try {
      pixels = ctx.getImageData(0, 0, sw, sh)
    } catch {
      return warnings // tainted/blocked canvas — skip pixel checks silently.
    }

    const { meanLuminance, laplacianVariance } = computeLuminanceStats(pixels.data, sw, sh)
    if (meanLuminance < minMeanLuminance) warnings.push('tooDark')
    if (enableBlurCheck && laplacianVariance < minLaplacianVariance) warnings.push('blurry')

    if (DEBUG_QUALITY_METRICS) {
      // eslint-disable-next-line no-console
      console.log('[visa quality]', file.name, {
        width: w,
        height: h,
        megapixels: +megapixels.toFixed(2),
        meanLuminance: +meanLuminance.toFixed(1),
        laplacianVariance: +laplacianVariance.toFixed(1),
        warnings,
      })
    }

    return warnings
  } catch {
    return [] // never let a quality check break file selection.
  }
}
