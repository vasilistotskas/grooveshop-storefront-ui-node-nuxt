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
      console.info('Preview mode enabled')
    },
    onDisable: () => {
      console.info('Preview mode disabled')
    },
  })
}
