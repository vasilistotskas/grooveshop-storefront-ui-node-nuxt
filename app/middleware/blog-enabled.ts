/**
 * Middleware to check if the blog feature is accessible.
 *
 * Gates on the tenant plan flag `TenantConfig.blogEnabled`.
 * There is no extra_settings counterpart — the tenant flag is the sole gate.
 *
 * A hard 404 is thrown (not a redirect) so the feature's existence is not
 * leaked to tenants for whom it is disabled.
 */
export default defineNuxtRouteMiddleware(() => {
  const tenantStore = useTenantStore()

  if (!tenantStore.blogEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
