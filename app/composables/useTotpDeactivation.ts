/**
 * Turning the authenticator app off, apart from its drawing
 * (`Storefront/Account/TwoFactorTotpDeactivate` and the tenants' own): the
 * page is only for a shopper who has one, so while allauth cannot report
 * it (the same `authenticators/totp/svg` request the activation reads) the
 * shopper goes back to the Security page. `deactivate()` resolves `true` once
 * the app is unlinked, after toasting `messages.deactivated()` (the
 * drawing's own words and icon), `onDeactivated` and the way back to
 * the Security page. A refusal is allauth's, through `handleAllAuthClientError`.
 *
 * Awaited in `<script setup>`: the status is read before it returns. Its
 * hooks are registered before that wait, while the component is still
 * the current instance.
 */
export async function useTotpDeactivation(options: {
  messages: { deactivated: () => ToastInput }
  onDeactivated: () => void
}) {
  const { deactivateTotp, totpAuthenticatorStatus } = useAllAuthAccount()
  const toast = useToast()
  const localePath = useLocalePath()

  const loading = ref(false)

  const request = useAsyncData(
    'totpAuthenticatorStatus',
    () => totpAuthenticatorStatus(),
  )

  watchEffect(async () => {
    if (request.error.value) {
      await navigateTo(localePath('account-security'))
    }
  })

  onReactivated(async () => {
    await request.refresh()
  })

  async function deactivate(): Promise<boolean> {
    try {
      loading.value = true
      await deactivateTotp()
      toast.add(options.messages.deactivated())
      options.onDeactivated()
      await navigateTo(localePath('account-security'))
      return true
    }
    catch (failure) {
      handleAllAuthClientError(failure)
      return false
    }
    finally {
      loading.value = false
    }
  }

  await request

  return { loading, deactivate }
}
