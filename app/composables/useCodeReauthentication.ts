/**
 * Confirming a security change with a code from the authenticator app or
 * a recovery code (allauth's `mfa_reauthenticate` step). The caller
 * decides the code is complete; `submit(code)` sends it, once at a time
 * (`submitting`), and toasts `success`. It resolves `false` for a code
 * allauth refused, which the caller clears. Where the shopper goes next
 * is the auth plugin's `auth:change` chain.
 */
export function useCodeReauthentication(success: () => ToastInput) {
  const { twoFaReauthenticate } = useAllAuthAuthentication()
  const toast = useToast()

  const submitting = ref(false)

  async function submit(code: string): Promise<boolean> {
    if (submitting.value) return false
    submitting.value = true
    try {
      await twoFaReauthenticate({ code })
      toast.add(success())
      return true
    }
    catch (error) {
      handleAllAuthClientError(error)
      return false
    }
    finally {
      submitting.value = false
    }
  }

  return { submitting, submit }
}
