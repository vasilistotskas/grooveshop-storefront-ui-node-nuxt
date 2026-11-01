import { createError, useRuntimeConfig } from 'nuxt/server'

/**
 * The store's menus, ready for the chrome: the header, mobile and footer
 * documents of the current release (`parseDocument`) as the links and
 * columns `useNavigation` reads (`navigationItems`). A group the release does
 * not have is simply absent, which the chrome reads as "use the built-in
 * menu", as for any store that never set one.
 *
 * A link to a page or a content page that is not published is HIDDEN here
 * (and a footer column left with none): the release names its pages
 * (`builder/published`), the content pages are the store's published
 * ones. If either cannot be read the route fails instead of answering a
 * menu that would hide the wrong links, and a failure is never cached.
 *
 * Cached as the handler named `builderChrome`, which Django's purge after a
 * release names (`core/cache/surfaces.py`, the `builder` surface); the key
 * carries the store, the language and the epoch a release moves.
 */
export default defineCachedRoute(async (event): Promise<NavigationItems> => {
  const { apiBaseUrl } = useRuntimeConfig()
  try {
    const published = await parseDataAs(
      await useBackendFetch(event)(`${apiBaseUrl}/builder/published`, {
        method: 'GET',
        query: { locale: requestLocale(event) },
      }),
      ZodBuilderPublishedSummary,
    )
    const contentPages = await publishedContentLocalesForHost(requestTenantHost(event), apiBaseUrl)
    if (!contentPages) {
      throw createError({ status: 502, statusText: 'The published content pages could not be read' })
    }
    const targets: NavigationTargets = {
      pages: new Set(published.pages.map(({ key }) => key)),
      contentPages: new Set(contentPages.keys()),
    }
    return Object.assign({}, ...Object.values(published.groups).map(group =>
      navigationItems(parseDocument(group, 'group'), targets)))
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'builderChrome',
  maxAge: 60 * 5,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => tenantCacheKey(event, 'builder:chrome'),
})
