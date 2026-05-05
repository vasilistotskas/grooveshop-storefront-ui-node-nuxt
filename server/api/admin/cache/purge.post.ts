import { z } from 'zod'

/**
 * Admin cache purge endpoint, called by the Django admin's
 * CacheService to invalidate Nitro SSR cache entries that mirror
 * Django data.
 *
 * Auth: shared-secret header `X-Cache-Purge-Token` (timing-safe compare).
 *
 * Body:
 *   {
 *     patterns: string[]  // glob patterns; trailing `*` is implicit when stripped
 *     dryRun?: boolean    // default false
 *   }
 *
 * Response:
 *   {
 *     matched: number     // total keys matched across patterns
 *     deleted: number     // keys actually removed (== matched unless dryRun)
 *     blocked: number     // matched keys filtered out by the deny list
 *     dryRun: boolean
 *   }
 *
 * Notes:
 *   - Patterns may be supplied either with or without the unstorage
 *     mount prefix (`cache:`). Both forms are accepted; the `cache:`
 *     prefix is stripped before delegating to `useStorage('cache')`.
 *   - Only the trailing `*` glob is honored. Mid-pattern globs are
 *     translated to a regex post-filter so callers can do
 *     `cache:nitro:handlers:Foo*` AND e.g. `cache:nitro:handlers:*Bar*`.
 */

const PROTECTED_FRAGMENTS = [
  'session:',
  'throttle:',
  'rate-limit:',
  'health:',
  'circuit_breaker:',
  'bull:',
] as const

const bodySchema = z.object({
  patterns: z.array(z.string().min(1)).min(1).max(64),
  dryRun: z.boolean().optional().default(false),
})

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

function isProtected(key: string): boolean {
  return PROTECTED_FRAGMENTS.some(f => key.includes(f))
}

function patternToMatcher(pattern: string): { prefix: string, regex: RegExp | null } {
  const stripped = pattern.startsWith('cache:') ? pattern.slice('cache:'.length) : pattern
  const star = stripped.indexOf('*')
  if (star === -1) {
    return { prefix: stripped, regex: null }
  }
  if (star === stripped.length - 1) {
    return { prefix: stripped.slice(0, -1), regex: null }
  }
  // Mid-pattern glob — fall back to regex post-filter against the
  // shortest deterministic prefix.
  const prefix = stripped.slice(0, star)
  const escaped = stripped
    .split('*')
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return { prefix, regex: new RegExp(`^${escaped}$`) }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const expected = (config.cachePurgeToken as string | undefined) || ''
  const supplied = getRequestHeader(event, 'x-cache-purge-token') || ''

  if (!expected || !supplied || !timingSafeEqual(expected, supplied)) {
    log.warn('cache-purge', 'Rejected: invalid token', {
      ip: getRequestIP(event, { xForwardedFor: true }),
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)
  const storage = useStorage('cache')

  let matched = 0
  let deleted = 0
  let blocked = 0
  const visited = new Set<string>()

  for (const pattern of body.patterns) {
    const { prefix, regex } = patternToMatcher(pattern)
    let keys: string[]
    try {
      keys = await storage.getKeys(prefix)
    }
    catch (error) {
      log.warn('cache-purge', 'getKeys failed', {
        prefix,
        error: error instanceof Error ? error.message : String(error),
      })
      continue
    }

    for (const key of keys) {
      if (visited.has(key)) continue
      visited.add(key)
      if (regex && !regex.test(key)) continue
      if (isProtected(key)) {
        blocked += 1
        continue
      }
      matched += 1
      if (!body.dryRun) {
        try {
          await storage.removeItem(key)
          deleted += 1
        }
        catch (error) {
          log.warn('cache-purge', 'removeItem failed', {
            key,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
  }

  log.info('cache-purge', 'Completed', {
    patterns: body.patterns,
    matched,
    deleted,
    blocked,
    dryRun: body.dryRun,
  })

  return { matched, deleted, blocked, dryRun: body.dryRun }
})
