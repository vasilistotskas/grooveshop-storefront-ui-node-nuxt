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
          return await fetchAll(links.next, accumulatedItems, pageCount + 1)
        }

        return accumulatedItems
      }

      return await fetchAll(url)
    },
    {
      maxAge,
      name,
      getKey: (tenantKey: string, url: string) => `${tenantKey}:${url}`,
    },
  )
}
