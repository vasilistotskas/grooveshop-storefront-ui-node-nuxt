import * as z from 'zod'

/** Why the browser, not allauth, did not make the key. */
export type WebAuthnFailure = 'cancelled' | 'registered' | 'other'

/**
 * Add a passkey or a security key: allauth's creation options go to the
 * browser, the credential comes back under the name given. A key made to
 * sign in on its own (a passkey, allauth's `passwordless`) is offered
 * only where the store lets passkeys sign in (`passkeyLogin`).
 *
 * When the key is the account's first second factor allauth also makes
 * recovery codes, and the shopper is sent to see them; otherwise to
 * `listRoute`. A failure says which it was in the shopper's language:
 * allauth's refusals by their codes, the browser's by the two it names
 * (cancelled or timed out; a key already here), never the browser's
 * English message. `add` resolves `true` once the key is added.
 *
 * The name is required and at most 255 characters here; allauth's add
 * form takes any name or none (`allauth/mfa/webauthn/forms.py`,
 * `_BaseAddWebAuthnForm.name` is `CharField(required=False)`), so both
 * limits are this form's own.
 */
export function useAddWebAuthnKey(options: {
  /** Where the shopper lands after adding a key that made no recovery codes. */
  listRoute: Parameters<ReturnType<typeof useLocalePath>>[0]
  added: () => ToastInput
  failed: (failure: WebAuthnFailure) => string
}) {
  const { t } = useNuxtApp().$i18n
  const { getWebAuthnCreateOptions, addWebAuthnCredential } = useAllAuthAccount()
  const { config } = storeToRefs(useAuthStore())
  const toast = useToast()
  const localePath = useLocalePath()

  const passkeyLogin = computed(() => config.value?.mfa?.passkey_login_enabled ?? false)

  const schema = z.object({
    name: z.string().trim().min(1, t('validation.required')).max(255, t('validation.max', { max: 255 })),
    passwordless: z.boolean(),
  })
  type Values = z.output<typeof schema>

  function failureOf(error: unknown): WebAuthnFailure {
    if (error instanceof DOMException && error.name === 'NotAllowedError') return 'cancelled'
    if (error instanceof DOMException && error.name === 'InvalidStateError') return 'registered'
    return 'other'
  }

  const loading = ref(false)

  async function add(values: Values): Promise<boolean> {
    loading.value = true
    try {
      const created = await getWebAuthnCreateOptions(values.passwordless)
      const json = created?.data.creation_options.publicKey
      if (!json) throw new Error('allauth sent no creation options')
      const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(json)
      const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential
      const response = await addWebAuthnCredential({ name: values.name.trim(), credential: credential.toJSON() })
      toast.add(options.added())
      await navigateTo(response?.meta.recovery_codes_generated
        ? localePath('account-2fa-recovery-codes')
        : localePath(options.listRoute))
      return true
    }
    catch (error) {
      if (isAllAuthClientError(error)) {
        handleAllAuthClientError(error)
        return false
      }
      log.error({ action: 'webauthn:add', error })
      toast.add({ title: options.failed(failureOf(error)), color: 'error' })
      return false
    }
    finally {
      loading.value = false
    }
  }

  return { schema, passkeyLogin, loading, add }
}
