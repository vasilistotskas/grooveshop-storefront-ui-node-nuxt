import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * Answering allauth's second-factor challenge (`mfa_authenticate`) with a
 * code from the authenticator app (six digits, `MFA_TOTP_DIGITS` in the
 * Django settings) or a recovery code (eight, allauth's
 * `MFA_RECOVERY_CODE_DIGITS` default, not overridden there), as soon as
 * the last digit lands.
 *
 * The digits go into `code` (the pin boxes); `recoveryInOneField` makes a
 * recovery code a single text field instead (`recoveryCode`). Where the
 * shopper is sent afterwards belongs to the auth plugin's `auth:change`
 * chain; a further pending step is followed (`tryAdvanceToPendingFlow`),
 * a wrong code keeps the same flow pending and shows `showError`.
 * `onAuthenticated` runs once the shopper is through.
 */
export function useTwoFactorAuthenticate(options: {
  authenticatorType: MaybeRefOrGetter<AuthenticatorTypeValues>
  recoveryInOneField: boolean
  lengthMessage: (digits: number) => string
  success: () => ToastInput
  onAuthenticated?: () => void
}) {
  const { t } = useNuxtApp().$i18n
  const { twoFaAuthenticate } = useAllAuthAuthentication()
  const toast = useToast()
  const { session } = storeToRefs(useAuthStore())

  // Race-free reference for tryAdvanceToPendingFlow (see app/utils/auth.ts).
  const formPath = useRoute().path

  const isRecovery = computed(() => toValue(options.authenticatorType) === AuthenticatorType.RECOVERY_CODES)
  const codeLength = computed(() => isRecovery.value ? 8 : 6)

  const showError = ref(false)
  const code = ref<string[]>([])
  const recoveryCode = ref('')
  const codeString = computed(() =>
    options.recoveryInOneField && isRecovery.value ? recoveryCode.value.trim() : code.value.join(''),
  )

  const schema = computed(() => z.object({
    code: z.string()
      .min(1, t('validation.required'))
      .length(codeLength.value, options.lengthMessage(codeLength.value)),
  }))

  async function onSubmit(event: FormSubmitEvent<z.output<typeof schema.value>>): Promise<void> {
    try {
      showError.value = false

      const response = await twoFaAuthenticate({ code: event.data.code })

      session.value = response?.data

      toast.add(options.success())
      options.onAuthenticated?.()
    }
    catch (error) {
      // A wrong code keeps the same mfa_authenticate flow pending (same
      // route), so tryAdvanceToPendingFlow returns false and the error shows.
      if (await tryAdvanceToPendingFlow(error, { fromPath: formPath })) return
      showError.value = true
      handleAllAuthClientError(error)
    }
  }

  watch(codeString, (newCode) => {
    if (newCode.length === codeLength.value) {
      onSubmit({ data: { code: newCode } } as FormSubmitEvent<z.output<typeof schema.value>>)
    }
  })

  return { isRecovery, codeLength, code, recoveryCode, codeString, schema, showError, onSubmit }
}
