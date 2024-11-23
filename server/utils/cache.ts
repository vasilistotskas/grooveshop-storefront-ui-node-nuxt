import type { CachedEventHandlerOptions } from 'nitropack'

const DEFAULT_CACHE_MAX_AGE = 60 * 60 * 2

export function getCachedEventHandlerOptions() {
  const config = useRuntimeConfig()
  const cacheMaxAge = config.cacheMaxAge || DEFAULT_CACHE_MAX_AGE
  return {
    maxAge: Number(cacheMaxAge),
    base: config.cacheBase,
  } satisfies CachedEventHandlerOptions
}
