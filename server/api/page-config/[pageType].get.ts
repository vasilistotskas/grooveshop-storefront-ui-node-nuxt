export default defineCachedEventHandler(async (event) => {
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
    }
  }
  catch (error) {
    await handleError(error)
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
