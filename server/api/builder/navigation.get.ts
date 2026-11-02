/**
 * The store's menus, ready for the chrome: the header, mobile and footer
 * documents of the current release as the links and columns
 * `useNavigation` reads (`builderNavigationOf`). A group the release does
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
  try {
    const published = await readPublishedSummary(event)
    return builderNavigationOf(published.groups, await publishedTargets(event, published))
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
