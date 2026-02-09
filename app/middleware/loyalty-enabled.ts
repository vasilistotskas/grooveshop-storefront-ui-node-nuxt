/**
 * Middleware to check if loyalty system is enabled
 *
 * Redirects to home page if loyalty is disabled
 */
export default defineNuxtRouteMiddleware(async () => {
  const { data: settings, error } = await useLoyalty().fetchSettings()

  // Redirect to home if loyalty is disabled or if there was an error fetching settings
  if (error.value || !settings.value?.enabled) {
    const localePath = useLocalePath()
    return navigateTo(localePath('index'))
  }
})
