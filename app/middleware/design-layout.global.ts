/**
 * The layout the tenant's design draws a KIND of page in.
 *
 * Page files fix their layout at build time, so a page cannot pick one
 * per store; this resolves it per request instead (`resolveLayout`). The
 * sign-in pages take the Volt `auth-split` layout; a store frozen in the
 * previous design keeps the layout its page file names.
 */
export default defineNuxtRouteMiddleware((to) => {
  const name = useNuxtApp().$routeBaseName(to)
  if (typeof name !== 'string' || !isAuthPageRoute(name)) return
  const layout = resolveLayout('auth', useTenantStore().schemaName)
  if (layout) setPageLayout(layout)
})
