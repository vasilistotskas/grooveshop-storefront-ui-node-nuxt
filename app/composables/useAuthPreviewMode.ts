export function useAuthPreviewMode() {
  const { user } = useUserSession()
  const shouldEnable = computed(() => {
    return (user.value?.isSuperuser || import.meta.dev || process.env.NODE_ENV === 'development') ?? false
  })

  return usePreviewMode({
    shouldEnable: () => {
      return shouldEnable.value
    },
    onEnable: () => {
      log.info('preview', 'Preview mode enabled')
    },
    onDisable: () => {
      log.info('preview', 'Preview mode disabled')
    },
  })
}
