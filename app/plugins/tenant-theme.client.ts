export default defineNuxtPlugin(() => {
  const tenant = useTenant()
  if (!tenant.value) return

  // Update Nuxt UI semantic colors at runtime
  const appConfig = useAppConfig()
  if (tenant.value.primaryColor) {
    appConfig.ui.colors.primary = tenant.value.primaryColor
  }
  if (tenant.value.neutralColor) {
    appConfig.ui.colors.neutral = tenant.value.neutralColor
  }
})
