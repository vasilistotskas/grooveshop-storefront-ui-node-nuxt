/**
 * Confirming a security change with a code mailed to the shopper's own
 * address (allauth's `reauthenticate_by_code` step). Three calls: `requestCode`
 * asks for the mail and moves on to the step that takes it, `confirm` sends
 * the six digits (and toasts `success`; resolves `false` for a code allauth
 * refused, which the caller clears), `resend` asks again. Where the shopper
 * goes after a confirmed code is the auth plugin's `auth:change` chain.
 *
 * The address is the one the shopper signed in with: allauth lists the
 * verified addresses it will mail in the 401's `recipients`, but that 401 is
 * gone after a reload, and a signed-in account always has a verified address
 * (an unverified one cannot sign in), so the account's own is the one asked.
 */
export function useEmailCodeReauthentication() {
  const { requestReauthenticationCode, confirmReauthenticationCode, resendReauthenticationCode } = useAllAuthAuthentication()
  const { user } = useUserSession()
  const toast = useToast()
  const router = useRouter()
  const localePath = useLocalePath()

  const maskedAddress = computed(() => maskEmail(user.value?.email ?? ''))

  // Carried on to the next step only as a path of this store.
  const next = returnPath(router.currentRoute.value.query.next)
  const stepRoute = (name: 'account-reauthenticate-code' | 'account-reauthenticate-code-confirm') =>
    localePath({ name, query: next ? { next } : undefined })

  const sending = ref(false)
  const submitting = ref(false)
  const hasError = ref(false)

  async function requestCode(sent: () => ToastInput): Promise<boolean> {
    if (sending.value || !user.value?.email) return false
    sending.value = true
    try {
      await requestReauthenticationCode({ email: user.value.email })
      toast.add(sent())
      await router.push(stepRoute('account-reauthenticate-code-confirm'))
      return true
    }
    catch (error) {
      handleAllAuthClientError(error)
      return false
    }
    finally {
      sending.value = false
    }
  }

  async function confirm(code: string, success: () => ToastInput, startOver: () => ToastInput): Promise<boolean> {
    if (submitting.value) return false
    submitting.value = true
    hasError.value = false
    try {
      await confirmReauthenticationCode({ code })
      toast.add(success())
      return true
    }
    catch (error) {
      // No code is waiting for this answer (it expired, or the session
      // lost it): the way on is to ask for one.
      if (isConflictClientError(error)) {
        toast.add(startOver())
        await router.push(stepRoute('account-reauthenticate-code'))
        return false
      }
      hasError.value = true
      handleAllAuthClientError(error)
      return false
    }
    finally {
      submitting.value = false
    }
  }

  return { maskedAddress, sending, submitting, hasError, requestCode, confirm, resend: resendReauthenticationCode }
}
