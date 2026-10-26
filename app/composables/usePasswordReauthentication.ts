/**
 * Confirming a security change with the account password (allauth's
 * `reauthenticate` step). `submit(password)` sends it and toasts
 * `success`; it resolves `true` once allauth accepted it. Where the
 * shopper goes next is the auth plugin's `auth:change` chain.
 */
export function usePasswordReauthentication(success: () => ToastInput) {
  const { reauthenticate } = useAllAuthAuthentication()
  const toast = useToast()

  const loading = ref(false)

  async function submit(password: string): Promise<boolean> {
    try {
      loading.value = true
      await reauthenticate({ password })
      toast.add(success())
      return true
    }
    catch (error) {
      handleAllAuthClientError(error)
      return false
    }
    finally {
      loading.value = false
    }
  }

  return { loading, submit }
}
