import type { CachedEventHandlerOptions } from 'nitropack'

const DEFAULT_CACHE_MAX_AGE = 60 * 60 * 2
const DEFAULT_CACHE_BASE = 'redis'

export function getCachedEventHandlerOptions() {
  const config = useRuntimeConfig()
  const cacheMaxAge = config.cacheMaxAge || DEFAULT_CACHE_MAX_AGE
  const cacheBase = config.cacheBase || DEFAULT_CACHE_BASE
  return {
    maxAge: Number(cacheMaxAge),
    base: cacheBase,
  } satisfies CachedEventHandlerOptions
}
