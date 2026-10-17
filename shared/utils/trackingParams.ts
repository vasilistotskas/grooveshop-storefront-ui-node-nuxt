import { TRACKING_PARAMS, UTM_PARAM_PREFIX } from '../constants/trackingParams.ts'

/** Whether a query param name is an ad or campaign tag (`shared/constants/trackingParams.ts`). */
export function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase()
  return TRACKING_PARAMS.has(lower) || lower.startsWith(UTM_PARAM_PREFIX)
}

function paramName(pair: string): string {
  const raw = pair.split('=', 1)[0] ?? ''
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '))
  }
  catch {
    return raw
  }
}

/**
 * `pathAndQuery` without its tracking params. The other params keep their
 * exact bytes and order — nothing is decoded and re-encoded — so a URL
 * with no tracking param comes back as the very same string, and two
 * URLs differing only in tracking params come back equal.
 */
export function withoutTrackingParams(pathAndQuery: string): string {
  const queryAt = pathAndQuery.indexOf('?')
  if (queryAt === -1) return pathAndQuery

  const pairs = pathAndQuery.slice(queryAt + 1).split('&')
  const kept = pairs.filter(pair => !isTrackingParam(paramName(pair)))
  if (kept.length === pairs.length) return pathAndQuery

  const path = pathAndQuery.slice(0, queryAt)
  return kept.length ? `${path}?${kept.join('&')}` : path
}
