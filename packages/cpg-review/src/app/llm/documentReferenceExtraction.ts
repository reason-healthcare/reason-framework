const DEFAULT_ATTACHMENT_TEXT_EXCERPT_CHARS = 400
const DEFAULT_ATTACHMENT_MAX_BASE64_CHARS = 2_000_000
const DEFAULT_PDF_EXTRACT_TIMEOUT_MS = 2_500

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

const ATTACHMENT_TEXT_EXCERPT_CHARS = parsePositiveInt(
  process.env.LLM_PROMPT_ATTACHMENT_TEXT_EXCERPT_CHARS,
  DEFAULT_ATTACHMENT_TEXT_EXCERPT_CHARS
)
const ATTACHMENT_MAX_BASE64_CHARS = parsePositiveInt(
  process.env.LLM_PROMPT_ATTACHMENT_MAX_BASE64_CHARS,
  DEFAULT_ATTACHMENT_MAX_BASE64_CHARS
)
const PDF_EXTRACT_TIMEOUT_MS = parsePositiveInt(
  process.env.LLM_PROMPT_PDF_EXTRACT_TIMEOUT_MS,
  DEFAULT_PDF_EXTRACT_TIMEOUT_MS
)
const PDF_EXTRACT_ENABLED = process.env.LLM_PROMPT_PDF_EXTRACT_ENABLED !== 'false'

const TEXT_MIME_PREFIXES = ['text/']
const TEXT_MIME_EXACT = new Set([
  'application/json',
  'application/xml',
  'application/fhir+json',
  'application/fhir+xml',
  'application/xhtml+xml',
])

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}...(truncated)`
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ')
}

function safeDecodeBase64(data: string): Buffer | undefined {
  try {
    return Buffer.from(data, 'base64')
  } catch {
    return undefined
  }
}

function looksMostlyPrintable(value: string): boolean {
  if (!value) return false
  const sample = value.slice(0, 4000)
  let printableCount = 0

  for (const char of sample) {
    const code = char.charCodeAt(0)
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126)) {
      printableCount += 1
    }
  }

  return printableCount / sample.length > 0.85
}

function isLikelyTextMime(mimeType: string): boolean {
  const lower = mimeType.toLowerCase()
  if (TEXT_MIME_EXACT.has(lower)) return true
  return TEXT_MIME_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

function isPdfMime(mimeType: string): boolean {
  return mimeType.toLowerCase() === 'application/pdf'
}

function isKnownBinaryMime(mimeType: string): boolean {
  const lower = mimeType.toLowerCase()
  return (
    lower.startsWith('image/') ||
    lower.startsWith('audio/') ||
    lower.startsWith('video/') ||
    lower.includes('application/octet-stream')
  )
}

async function extractPdfText(buffer: Buffer): Promise<string | undefined> {
  if (!PDF_EXTRACT_ENABLED) return undefined

  const timeoutPromise = new Promise<undefined>((resolve) => {
    setTimeout(() => resolve(undefined), PDF_EXTRACT_TIMEOUT_MS)
  })

  const parsePromise = (async () => {
    try {
      const pdfParseModule = await import('pdf-parse')
      const parsed = await pdfParseModule.default(buffer)
      return parsed.text
    } catch {
      return undefined
    }
  })()

  return Promise.race([parsePromise, timeoutPromise])
}

export async function decodeDocumentAttachmentText(
  attachment?: fhir4.Attachment
): Promise<string> {
  if (!attachment?.data) return 'none'

  const mimeType = (attachment.contentType ?? '').toLowerCase()
  if (attachment.data.length > ATTACHMENT_MAX_BASE64_CHARS) {
    return `attachment omitted: exceeds max payload (${ATTACHMENT_MAX_BASE64_CHARS} base64 chars)`
  }

  const buffer = safeDecodeBase64(attachment.data)
  if (!buffer) return 'encoded attachment could not be decoded'

  if (isPdfMime(mimeType)) {
    const text = await extractPdfText(buffer)
    if (!text) {
      return PDF_EXTRACT_ENABLED
        ? 'pdf attachment: no extractable text or extraction timed out'
        : 'pdf attachment extraction disabled'
    }
    const normalized = compactWhitespace(text)
    return normalized
      ? truncate(normalized, ATTACHMENT_TEXT_EXCERPT_CHARS)
      : 'pdf attachment contained no text'
  }

  if (isKnownBinaryMime(mimeType)) {
    return `encoded binary attachment (${mimeType || 'unknown mime'})`
  }

  const decodedText = buffer.toString('utf8')
  const maybeHtmlText = mimeType.includes('html') ? stripHtmlTags(decodedText) : decodedText
  const normalized = compactWhitespace(maybeHtmlText)

  if (isLikelyTextMime(mimeType) || looksMostlyPrintable(normalized)) {
    return normalized
      ? truncate(normalized, ATTACHMENT_TEXT_EXCERPT_CHARS)
      : 'text attachment contained no visible text'
  }

  return `encoded non-text attachment (${mimeType || 'unknown mime'})`
}
