import { chunkItems, normalizeChunkSize } from 'llm/chunkItems'

describe('chunkItems', () => {
  it('normalizes invalid chunk sizes to default bounds', () => {
    expect(normalizeChunkSize(0)).toBe(5)
    expect(normalizeChunkSize(-1)).toBe(5)
    expect(normalizeChunkSize(3)).toBe(5)
    expect(normalizeChunkSize(7)).toBe(7)
    expect(normalizeChunkSize(20)).toBe(10)
  })

  it('splits arrays using bounded chunk size', () => {
    const values = Array.from({ length: 12 }).map((_, index) => index + 1)
    const chunks = chunkItems(values, 5)

    expect(chunks).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12],
    ])
  })

  it('returns empty array for empty input', () => {
    expect(chunkItems([], 5)).toEqual([])
  })
})
