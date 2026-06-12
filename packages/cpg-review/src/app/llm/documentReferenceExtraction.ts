import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_ATTACHMENT_TEXT_EXCERPT_CHARS = 400
const DEFAULT_ATTACHMENT_MAX_BASE64_CHARS = 2_000_000
const DEFAULT_PDF_EXTRACT_TIMEOUT_MS = 12_000

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
const PDF_EXTRACT_ENABLED =
  process.env.LLM_PROMPT_PDF_EXTRACT_ENABLED !== 'false'
const PDF_TEXT_CLI_FALLBACK_ENABLED =
  process.env.LLM_PROMPT_PDF_TEXT_CLI_FALLBACK_ENABLED !== 'false'

type PdfExtractResult =
  | { status: 'disabled' }
  | { status: 'timeout' }
  | { status: 'error' }
  | { status: 'ok'; text?: string }

async function extractPdfTextWithPdfParse(
  buffer: Buffer
): Promise<string | undefined> {
  const pdfParseModule = await import('pdf-parse')
  const PDFParse = (pdfParseModule as { PDFParse?: unknown }).PDFParse
  if (typeof PDFParse !== 'function') {
    throw new Error('pdf-parse module does not expose the PDFParse API')
  }

  const parser = new (PDFParse as new (input: { data: Buffer }) => {
    getText: () => Promise<{ text: string }>
    destroy?: () => Promise<void> | void
  })({ data: buffer })

  try {
    const parsed = await parser.getText()
    return parsed.text
  } finally {
    await parser.destroy?.()
  }
}

async function extractPdfTextWithPdfJs(
  buffer: Buffer
): Promise<string | undefined> {
  const pdfJsModule = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const getDocument = (
    pdfJsModule as { getDocument: (input: { data: Uint8Array }) => any }
  ).getDocument

  const loadingTask = getDocument({ data: new Uint8Array(buffer) })
  const pdf = await loadingTask.promise
  const pageTexts: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const items = Array.isArray(textContent?.items)
      ? (textContent.items as Array<{ str?: string }>)
      : []
    const pageText = items
      .map((item) => (typeof item?.str === 'string' ? item.str : ''))
      .join(' ')
      .trim()

    if (pageText) pageTexts.push(pageText)
  }

  return pageTexts.join('\n')
}

function runExecFile(
  file: string,
  args: string[],
  timeout: number
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { encoding: 'utf8', timeout, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }

        resolve({ stdout, stderr })
      }
    )
  })
}

async function extractPdfTextWithPdftotext(
  buffer: Buffer
): Promise<string | undefined> {
  if (!PDF_TEXT_CLI_FALLBACK_ENABLED) return undefined

  const tempDir = await mkdtemp(join(tmpdir(), 'cpg-review-pdf-'))
  const inputPath = join(tempDir, 'document.pdf')
  const outputPath = join(tempDir, 'document.txt')

  try {
    await writeFile(inputPath, buffer)
    await runExecFile(
      'pdftotext',
      ['-layout', inputPath, outputPath],
      PDF_EXTRACT_TIMEOUT_MS
    )
    const extracted = await readFile(outputPath, 'utf8')
    return extracted
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

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
    if (
      code === 9 ||
      code === 10 ||
      code === 13 ||
      (code >= 32 && code <= 126)
    ) {
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

async function extractPdfText(buffer: Buffer): Promise<PdfExtractResult> {
  if (!PDF_EXTRACT_ENABLED) return { status: 'disabled' }

  const parsePromise = (async (): Promise<PdfExtractResult> => {
    try {
      const text = await extractPdfTextWithPdfParse(buffer)
      return { status: 'ok', text }
    } catch {
      try {
        const text = await extractPdfTextWithPdfJs(buffer)
        return { status: 'ok', text }
      } catch {
        try {
          const text = await extractPdfTextWithPdftotext(buffer)
          return { status: 'ok', text }
        } catch {
          return { status: 'error' }
        }
      }
    }
  })()

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<PdfExtractResult>((resolve) => {
    timeoutHandle = setTimeout(
      () => resolve({ status: 'timeout' }),
      PDF_EXTRACT_TIMEOUT_MS
    )
  })

  const result = await Promise.race([parsePromise, timeoutPromise])
  if (timeoutHandle) clearTimeout(timeoutHandle)
  return result
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
    const extraction = await extractPdfText(buffer)
    if (extraction.status === 'disabled') {
      return 'pdf attachment extraction disabled'
    }

    if (extraction.status === 'timeout') {
      return `pdf attachment extraction timed out after ${PDF_EXTRACT_TIMEOUT_MS}ms`
    }

    if (extraction.status === 'error') {
      return 'pdf attachment extraction failed (parser error or unsupported/scan-only PDF)'
    }

    const normalized = compactWhitespace(extraction.text ?? '')
    return normalized
      ? truncate(normalized, ATTACHMENT_TEXT_EXCERPT_CHARS)
      : 'pdf attachment contained no text'
  }

  if (isKnownBinaryMime(mimeType)) {
    return `encoded binary attachment (${mimeType || 'unknown mime'})`
  }

  const decodedText = buffer.toString('utf8')
  const maybeHtmlText = mimeType.includes('html')
    ? stripHtmlTags(decodedText)
    : decodedText
  const normalized = compactWhitespace(maybeHtmlText)

  if (isLikelyTextMime(mimeType) || looksMostlyPrintable(normalized)) {
    return normalized
      ? truncate(normalized, ATTACHMENT_TEXT_EXCERPT_CHARS)
      : 'text attachment contained no visible text'
  }

  return `encoded non-text attachment (${mimeType || 'unknown mime'})`
}
