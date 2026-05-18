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
      data: Buffer.from('Patient feels better today.', 'utf8').toString('base64'),
    })

    expect(result).toContain('Patient feels better today.')
  })

  it('returns size guard message when payload exceeds configured max', async () => {
    process.env.LLM_PROMPT_ATTACHMENT_MAX_BASE64_CHARS = '10'
    const decodeDocumentAttachmentText = await loadExtractor()

    const result = await decodeDocumentAttachmentText({
      contentType: 'text/plain',
      data: Buffer.from('this content is definitely longer than ten base64 chars', 'utf8').toString('base64'),
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
      default: jest.fn().mockResolvedValue({ text: 'PDF extracted clinical summary' }),
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
      default: jest.fn().mockRejectedValue(new Error('parse failed')),
    }))

    const decodeDocumentAttachmentText = await loadExtractor()

    const result = await decodeDocumentAttachmentText({
      contentType: 'application/pdf',
      data: Buffer.from('%PDF fake bytes', 'utf8').toString('base64'),
    })

    expect(result).toBe('pdf attachment: no extractable text or extraction timed out')
  })
})
