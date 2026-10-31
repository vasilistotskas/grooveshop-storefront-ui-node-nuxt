import { SUPPORTED_LOCALES, type SupportedLocale } from '~~/i18n/locales'

interface DeclaredDocument {
  locales: SupportedLocale[]
  /**
   * The document's own unprefixed path (`/blog/post/1/slug`), when the
   * route's is not it: a decorative `[slug]` segment lets the route name
   * any URL, the document names one.
   */
  path?: string
}

/**
 * Which locales the document on a route actually exists in.
 *
 * The head pipeline (`setupPageHeader`) emits canonical and hreflang
 * for every locale the TENANT serves, because that is all it can know.
 * A page rendering a document that exists in fewer languages than that
 * declares them here, and the pipeline then:
 *
 * - drops the hreflang alternates for the missing locales — an
 *   alternate pointing at a page that renders another language is a
 *   false signal, and it is what the sitemap gate already withholds;
 * - points the canonical at the URL of the locale the document IS in
 *   when the current one is not among them, so the fallback render is
 *   never indexed as a second copy of the same text.
 *
 * An entity page (blog post, product, category) also declares its own
 * `path`: the canonical and every alternate are then built from it, in
 * the locale each names, instead of from whatever the route carried. A
 * page therefore never writes a canonical or an `hreflang` of its own —
 * a hard-coded one is what made every `/en/**` entity page canonicalise
 * to the Greek URL while the hreflang set offered the English one.
 * `canonicalUrl` is that same URL, for `og:url` and schema.org.
 *
 * Keyed by route path rather than a single value on purpose: a value
 * set by one page would leak onto the next navigation, and a keyed
 * entry for a route that is no longer current is simply never read.
 */
export function useDocumentLocales() {
  const state = useState<Record<string, DeclaredDocument>>(
    'document-locales',
    () => ({}),
  )
  const route = useRoute()
  const siteConfig = useSiteConfig()
  const tenantStore = useTenantStore()
  const { $i18n } = useNuxtApp()
  const localePath = useLocalePath()
  const switchLocalePath = useSwitchLocalePath()

  /**
   * Narrowed to the locales the storefront can ROUTE: a document may
   * carry a translation in a language no tenant serves, and that is
   * still not a URL a canonical or an hreflang could name.
   */
  const declare = (locales: readonly string[], path?: string) => {
    const routable = locales.filter((code): code is SupportedLocale =>
      (SUPPORTED_LOCALES as readonly string[]).includes(code),
    )
    state.value = { ...state.value, [route.path]: { locales: routable, path } }
    if (path) redirectToDocumentPath(path)
  }

  /**
   * A route's `[slug]` segment is decorative: the id names the record, so
   * `/products/2/any-slug` renders the product. Each such URL (a stale link
   * in CMS data, an old email, a backlink) would be a second address of the
   * same page, so a page whose own path is not the URL asked for answers a
   * permanent redirect to it: same language prefix, query and hash kept. It
   * runs where the page declares its document, from the entity that page
   * already fetched, so there is no request of its own. On the server it is
   * the response's 301; on a client navigation, a `replace`.
   */
  const redirectToDocumentPath = (path: string) => {
    const canonical = localePath({ path })
    if (!canonical || canonical === route.path) return
    void navigateTo(
      { path: canonical, query: route.query, hash: route.hash },
      { redirectCode: 301, replace: true },
    )
  }

  const forCurrentRoute = computed<DeclaredDocument | undefined>(
    () => state.value[route.path],
  )

  /**
   * The document's absolute URL in `locale`, without query or hash: a
   * canonical that named a visitor's `?utm_source=...` would index the
   * tracking parameters, which i18n's own canonical strips too.
   */
  const urlFor = (locale: string): string => {
    const path = forCurrentRoute.value?.path
    const localized = path
      ? localePath({ path }, locale as SupportedLocale)
      : switchLocalePath(locale as SupportedLocale)
    return localized ? `${siteConfig.url}${localized.split(/[?#]/)[0]}` : ''
  }

  const canonicalLocale = computed(() =>
    documentCanonicalLocale(
      forCurrentRoute.value?.locales,
      $i18n.locale.value as string,
      tenantStore.defaultLocale,
    ),
  )

  const canonicalUrl = computed(() => urlFor(canonicalLocale.value))

  return { declare, forCurrentRoute, urlFor, canonicalLocale, canonicalUrl }
}
