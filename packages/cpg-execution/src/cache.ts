import flatCache from 'flat-cache'

const cacheStoreId = 'cpg-apply'

export const resetCache = () => {
  const cache = flatCache.load(cacheStoreId)
  cache.destroy()
}

export default flatCache.load(cacheStoreId)
