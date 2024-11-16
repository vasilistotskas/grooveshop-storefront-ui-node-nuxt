import type { QueryObject } from 'ufo'

export function buildFullUrl(url: string, query: QueryObject): string {
  const valuesToExclude: (QueryObject[keyof QueryObject] | undefined)[] = [
    undefined,
    null,
    '',
    'null',
    'undefined',
  ]
  if (Object.keys(query).length > 0) {
    url += '?'
    Object.entries(query).forEach(([key, value]) => {
      if (!valuesToExclude.includes(value)) {
        url += `${key}=${value}&`
      }
    })
    if (url.endsWith('&')) {
      url = url.slice(0, -1)
    }
  }
  return url
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
