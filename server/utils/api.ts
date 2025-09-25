import type { QueryObject } from 'ufo'

export function buildFullUrl(
  base: string,
  query: QueryObject = {},
): string {
  const url = new URL(base)

  Object.entries(query).forEach(([key, value]) => {
    if (
      value != null
      && value !== ''
      && value !== 'null'
      && value !== 'undefined'
    ) {
      url.searchParams.append(key, String(value))
    }
  })

  return url.toString()
}

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
