import { hashedCacheKey } from './cacheKey'

export function getMimeType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
    default:
      return 'application/octet-stream'
  }
}

const MAX_PAGES = 100

/**
 * Re-anchor a DRF `links.next` URL onto the origin the FIRST page was
 * fetched from. Django builds `next` absolutely from X-Forwarded-Host —
 * under per-tenant host inversion that is the tenant's STOREFRONT
 * domain, which does not serve `/api/v1/**` (Nuxt answers there — 404
 * in production, and on staging the hop dies on the ingress basic-auth
 * with a plain-text 401). Only the path + query of `next` are
 * trustworthy; the origin must stay the internal base URL.
 */
function rebaseNextLink(next: string, baseUrl: string): string {
  try {
    const nextUrl = new URL(next)
    const base = new URL(baseUrl)
    return `${base.origin}${nextUrl.pathname}${nextUrl.search}`
  }
  catch {
    return next
  }
}

/**
 * Creates a cached fetcher for paginated data.
 *
 * Django resolves the tenant from X-Forwarded-Host, so the same URL returns
 * different data per tenant. Callers MUST pass a tenant discriminator (host
 * or schema name) as the first argument so cache entries don't bleed across
 * tenants.
 *
 * @param name - The unique name for the cache entry.
 * @param maxAge - The maximum age (in seconds) for the cached data.
 * @returns A cached function that fetches all paginated data of type T.
 */
export function createCachedFetcher<T>(
  name: string,
  maxAge: number,
): (tenantKey: string, url: string) => Promise<T[]> {
  return defineCachedFunction(
    async (tenantKey: string, url: string): Promise<T[]> => {
      // Forward the caller's storefront host as X-Forwarded-Host so
      // Django's TenantMainMiddleware resolves the right schema. Without
      // it the fetch falls back to the public schema and every tenant's
      // sitemap/RSS would be built from public-schema data (then cached
      // under the tenant key, so the wrong data sticks). The tenantKey
      // IS the request host (callers pass getRequestHost(event)).
      const headers = tenantKey
        ? { 'X-Forwarded-Host': tenantKey }
        : undefined

      const fetchAll = async (
        currentUrl: string,
        accumulatedItems: T[] = [],
        pageCount: number = 0,
      ): Promise<T[]> => {
        if (pageCount >= MAX_PAGES) return accumulatedItems

        const response = await $fetch<Pagination<T>>(currentUrl, {
          method: 'GET',
          headers,
        })

        const { results, links } = response

        if (results) {
          accumulatedItems.push(...results)
        }

        if (links?.next) {
          return await fetchAll(
            rebaseNextLink(links.next, url),
            accumulatedItems,
            pageCount + 1,
          )
        }

        return accumulatedItems
      }

      return await fetchAll(url)
    },
    {
      maxAge,
      name,
      // hashedCacheKey: nitropack escapes custom keys down to word
      // characters — without the hash suffix, punctuation-equivalent
      // tenant hosts/urls would share one cache entry (cross-tenant
      // leak). Same rationale as tenantCacheKey.
      getKey: (tenantKey: string, url: string) =>
        hashedCacheKey(`${tenantKey}:${url}`),
    },
  )
}
