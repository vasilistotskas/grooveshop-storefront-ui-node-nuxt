import { FetchError } from 'ofetch'

export default defineCachedEventHandler(async (event): Promise<PageConfigResponse> => {
  const config = useRuntimeConfig()
  const pageType = getRouterParam(event, 'pageType')

  try {
    // useBackendFetch: page_config rows are PER-TENANT tables — a raw
    // $fetch carries no X-Forwarded-Host, Django resolves the public
    // schema and every tenant would get 404/fallback (N1 pattern in
    // MULTI_TENANT_AUDIT.md).
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/page-config/${pageType}`,
      { method: 'GET' },
    )
    const layout = await parseDataAs(response, zPageLayout)
    // Admin-authored section props are validated per componentType and
    // unknown keys STRIPPED here — this route is the single producer of
    // PageSection data (SSR payload and client-side nav both fetch it),
    // so the Renderer can v-bind props as-is without shipping zod to
    // the client. Invalid props degrade to the component defaults with
    // a warn log instead of breaking the page; the parse cost rides the
    // SWR cache below rather than every render.
    return {
      layout: {
        ...layout,
        sections: layout.sections.map((section) => {
          const { props: safeProps, error } = parseSectionProps(
            section.componentType,
            section.props,
          )
          if (error) {
            log.warn({
              tag: 'page-config',
              message: 'invalid section props — component defaults used',
              componentType: section.componentType,
              error,
            })
          }
          return { ...section, props: safeProps }
        }),
      },
    }
  }
  catch (error) {
    // Django's 404 is "no PUBLISHED layout for this page type" — the
    // documented normal state for every page type defaults.py does not
    // seed (products, blog, contact, feedback, and any custom [slug]).
    // It is data, not a fault: return the absent state so the SWR cache
    // stores it (a thrown error is never cached, so each SSR of
    // /products and /blog cost a Django round-trip) and so the request
    // log stops carrying a warning plus stack trace per render. Every
    // other failure — 5xx, network, schema mismatch — still propagates:
    // the pages that turn "no layout" into a real 404 (about.vue,
    // [slug].vue) must be able to tell it apart from an outage.
    // See shared/types/pageConfig.ts for why null rides inside an object.
    if (error instanceof FetchError && error.statusCode === 404) {
      return { layout: null }
    }
    return handleError(error)
  }
}, {
  name: 'pageConfig',
  maxAge: 60 * 5,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: (event) => {
    const pageType = getRouterParam(event, 'pageType')
    return tenantCacheKey(event, `page-config:${pageType}`)
  },
})
