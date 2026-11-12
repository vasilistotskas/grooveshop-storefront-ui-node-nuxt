import { hasProtocol } from 'ufo'

/**
 * A link a store wrote (a page-builder link setting as `resolveLinks` answers
 * it, a banner's link) as the `to` a link component takes: an absolute URL
 * (`https://…`, someone else's page) as it is, which `NuxtLink` renders as an
 * external link (`rel="noopener noreferrer"`); a path of the store in the
 * page's language, its `?query` and `#hash` kept (`pathLocation`).
 *
 * The one rule for every section, band and banner: `localePath` given an
 * external URL as a location turned a partner's offer into a route of the
 * store.
 */
export function useLinkTo() {
  const localePath = useLocalePath()
  return (link: string): string => (hasProtocol(link, { acceptRelative: false }) ? link : localePath(pathLocation(link)))
}
