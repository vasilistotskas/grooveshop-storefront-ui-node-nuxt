export function useAuthPreviewMode() {
  const { user } = useUserSession()

  return usePreviewMode({
    shouldEnable: () => {
      return user.value?.isSuperuser ?? false
    },
    onEnable: () => {
      console.info('Preview mode enabled')
    },
    onDisable: () => {
      console.info('Preview mode disabled')
    },
  })
}
