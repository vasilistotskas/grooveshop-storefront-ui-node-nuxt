export function useAuthPreviewMode() {
  return usePreviewMode({
    shouldEnable: () => {
      const { user } = useUserSession()
      return user.value?.isSuperuser ?? false
    },
  })
}
