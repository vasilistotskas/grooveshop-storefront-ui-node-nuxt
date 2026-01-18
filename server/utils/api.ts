import type { Pagination } from '#shared/types/pagination'

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

/**
 * Creates a cached fetcher for paginated data.
 *
 * @param name - The unique name for the cache entry.
 * @param maxAge - The maximum age (in seconds) for the cached data.
 * @returns A cached function that fetches all paginated data of type T.
 */
export function createCachedFetcher<T>(
  name: string,
  maxAge: number,
): (url: string) => Promise<T[]> {
  return defineCachedFunction(
    async (url: string): Promise<T[]> => {
      const fetchAll = async (
        currentUrl: string,
        accumulatedItems: T[] = [],
      ): Promise<T[]> => {
        const response = await $fetch<Pagination<T>>(currentUrl, {
          method: 'GET',
        })

        const { results, links } = response

        if (results) {
          accumulatedItems.push(...results)
        }

        if (links?.next) {
          return await fetchAll(links.next, accumulatedItems)
        }

        return accumulatedItems
      }

      return await fetchAll(url)
    },
    {
      maxAge,
      name,
      getKey: (url: string) => url,
    },
  )
}
