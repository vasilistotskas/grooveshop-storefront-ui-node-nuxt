import { SUPPORTED_LOCALES, type SupportedLocale } from '~~/i18n/locales'

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
 * Keyed by route path rather than a single value on purpose: a value
 * set by one page would leak onto the next navigation, and a keyed
 * entry for a route that is no longer current is simply never read.
 */
export function useDocumentLocales() {
  const state = useState<Record<string, SupportedLocale[]>>(
    'document-locales',
    () => ({}),
  )
  const route = useRoute()

  /**
   * Narrowed to the locales the storefront can ROUTE: a document may
   * carry a translation in a language no tenant serves, and that is
   * still not a URL a canonical or an hreflang could name.
   */
  const declare = (locales: readonly string[]) => {
    const routable = locales.filter((code): code is SupportedLocale =>
      (SUPPORTED_LOCALES as readonly string[]).includes(code),
    )
    state.value = { ...state.value, [route.path]: routable }
  }

  const forCurrentRoute = computed<readonly SupportedLocale[] | undefined>(
    () => state.value[route.path],
  )

  return { declare, forCurrentRoute }
}
