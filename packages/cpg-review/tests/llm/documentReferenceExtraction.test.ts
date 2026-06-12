describe('decodeDocumentAttachmentText', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  async function loadExtractor() {
    const module = await import('llm/documentReferenceExtraction')
    return module.decodeDocumentAttachmentText
  }

  it('decodes text/plain base64 attachment', async () => {
    const decodeDocumentAttachmentText = await loadExtractor()

    const result = await decodeDocumentAttachmentText({
      contentType: 'text/plain',
      data: Buffer.from('Patient feels better today.', 'utf8').toString(
        'base64'
      ),
    })

    expect(result).toContain('Patient feels better today.')
  })

  it('returns size guard message when payload exceeds configured max', async () => {
    process.env.LLM_PROMPT_ATTACHMENT_MAX_BASE64_CHARS = '10'
    const decodeDocumentAttachmentText = await loadExtractor()

    const result = await decodeDocumentAttachmentText({
      contentType: 'text/plain',
      data: Buffer.from(
        'this content is definitely longer than ten base64 chars',
        'utf8'
      ).toString('base64'),
    })

    expect(result).toContain('attachment omitted: exceeds max payload')
  })

  it('returns binary marker for known binary mime types', async () => {
    const decodeDocumentAttachmentText = await loadExtractor()

    const result = await decodeDocumentAttachmentText({
      contentType: 'image/png',
      data: Buffer.from('not-an-image', 'utf8').toString('base64'),
    })

    expect(result).toBe('encoded binary attachment (image/png)')
  })

  it('extracts text from PDF when parser succeeds', async () => {
    jest.doMock('pdf-parse', () => ({
      __esModule: true,
      PDFParse: jest.fn().mockImplementation(() => ({
        getText: jest
          .fn()
          .mockResolvedValue({ text: 'PDF extracted clinical summary' }),
        destroy: jest.fn().mockResolvedValue(undefined),
      })),
    }))

    const decodeDocumentAttachmentText = await loadExtractor()

    const result = await decodeDocumentAttachmentText({
      contentType: 'application/pdf',
      data: Buffer.from('%PDF fake bytes', 'utf8').toString('base64'),
    })

    expect(result).toContain('PDF extracted clinical summary')
  })

  it('returns PDF fallback message when parser fails', async () => {
    jest.doMock('pdf-parse', () => ({
      __esModule: true,
      PDFParse: jest.fn().mockImplementation(() => ({
        getText: jest.fn().mockRejectedValue(new Error('parse failed')),
        destroy: jest.fn().mockResolvedValue(undefined),
      })),
    }))
    jest.doMock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
      getDocument: jest.fn(() => ({
        promise: Promise.reject(new Error('pdfjs failed')),
      })),
    }))

    const decodeDocumentAttachmentText = await loadExtractor()

    const result = await decodeDocumentAttachmentText({
      contentType: 'application/pdf',
      data: Buffer.from('%PDF fake bytes', 'utf8').toString('base64'),
    })

    expect(result).toBe(
      'pdf attachment extraction failed (parser error or unsupported/scan-only PDF)'
    )
  })

  it('uses pdftotext CLI fallback when JS PDF parsers fail', async () => {
    jest.doMock('pdf-parse', () => ({
      __esModule: true,
      PDFParse: jest.fn().mockImplementation(() => ({
        getText: jest.fn().mockRejectedValue(new Error('parse failed')),
        destroy: jest.fn().mockResolvedValue(undefined),
      })),
    }))
    jest.doMock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
      getDocument: jest.fn(() => ({
        promise: Promise.reject(new Error('pdfjs failed')),
      })),
    }))
    jest.doMock('node:child_process', () => ({
      execFile: jest.fn((file, args, options, callback) => {
        callback(null, '', '')
      }),
    }))
    jest.doMock('node:fs/promises', () => ({
      mkdtemp: jest.fn().mockResolvedValue('/tmp/cpg-review-pdf-test'),
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue('HER2 positive by IHC'),
      rm: jest.fn().mockResolvedValue(undefined),
    }))

    const decodeDocumentAttachmentText = await loadExtractor()

    const result = await decodeDocumentAttachmentText({
      contentType: 'application/pdf',
      data: Buffer.from('%PDF fake bytes', 'utf8').toString('base64'),
    })

    expect(result).toContain('HER2 positive by IHC')
  })

  it('returns timeout message when PDF extraction exceeds timeout', async () => {
    process.env.LLM_PROMPT_PDF_EXTRACT_TIMEOUT_MS = '1'
    jest.doMock('pdf-parse', () => ({
      __esModule: true,
      PDFParse: jest.fn().mockImplementation(() => ({
        getText: jest
          .fn()
          .mockImplementation(() => new Promise(() => undefined)),
        destroy: jest.fn().mockResolvedValue(undefined),
      })),
    }))

    const decodeDocumentAttachmentText = await loadExtractor()

    const result = await decodeDocumentAttachmentText({
      contentType: 'application/pdf',
      data: Buffer.from('%PDF fake bytes', 'utf8').toString('base64'),
    })

    expect(result).toBe('pdf attachment extraction timed out after 1ms')
  })
})
