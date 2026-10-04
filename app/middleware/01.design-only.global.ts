/**
 * Pages only the redesigned storefront has (`REDESIGN_ONLY_PAGES`, the
 * account's Security page): a store frozen in the previous design has
 * no body for them and never links to them, so there they are not
 * found — rather than the redesigned body inside the frozen frame.
 *
 * Global, and first (the `01.` prefix sorts it before every other
 * global middleware): `auth.global` would otherwise send a signed-out
 * visitor to sign in for a page that is not there once they have.
 */
export default defineNuxtRouteMiddleware((to) => {
  const name = useNuxtApp().$routeBaseName(to)
  if (typeof name !== 'string' || !REDESIGN_ONLY_PAGES.has(name as PageKey)) return
  if (!resolveDesign(useTenantStore().schemaName)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
