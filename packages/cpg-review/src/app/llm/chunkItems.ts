export const DEFAULT_RECOMMENDATION_CHUNK_SIZE = 5

export function normalizeChunkSize(size: number): number {
  if (!Number.isFinite(size) || size <= 0) {
    return DEFAULT_RECOMMENDATION_CHUNK_SIZE
  }

  const rounded = Math.floor(size)
  return Math.min(10, Math.max(5, rounded))
}

export function chunkItems<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) {
    return []
  }

  const normalizedSize = normalizeChunkSize(chunkSize)
  const chunks: T[][] = []

  for (let start = 0; start < items.length; start += normalizedSize) {
    chunks.push(items.slice(start, start + normalizedSize))
  }

  return chunks
}
