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
