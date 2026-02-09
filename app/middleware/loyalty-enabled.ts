/**
 * Middleware to check if loyalty system is enabled
 *
 * Redirects to home page if loyalty is disabled
 */
export default defineNuxtRouteMiddleware(async () => {
  const { loyaltyEnabled, settings, fetchSettings } = useLoyalty()

  // Fetch settings if not already loaded
  if (!settings.value) {
    await fetchSettings()
  }

  // Redirect to home if loyalty is disabled
  if (!loyaltyEnabled.value) {
    const localePath = useLocalePath()
    return navigateTo(localePath('index'))
  }
})
