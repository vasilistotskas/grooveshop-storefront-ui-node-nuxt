import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * Confirming the email with the six-digit code allauth mailed
 * (`Storefront/Auth/VerifyEmail` and the tenants' own): the pin input's
 * digits, the form's schema, and the request, sent by itself as the sixth
 * digit lands. A confirmed address (allauth answers 200, or 401 when it
 * confirmed without signing the shopper in) toasts and goes to the
 * account.
 *
 * `lengthMessage` is the "the code has six digits" sentence and
 * `successDescription` the success toast's line, each in the drawing's own
 * words; `successIcon` dresses that toast.
 */
export function useVerifyEmail(options: {
  lengthMessage: () => string
  successDescription: () => string
  successIcon?: string
}) {
  const { emailVerify } = useAllAuthAuthentication()
  const { t } = useNuxtApp().$i18n
  const toast = useToast()
  const localePath = useLocalePath()
  const router = useRouter()

  const hasError = ref(false)
  const code = ref<string[]>([])
  const codeString = computed(() => code.value.join(''))

  const schema = z.object({
    key: z.string()
      .min(1, t('validation.required'))
      .length(6, options.lengthMessage()),
  })

  async function verify(key: string): Promise<void> {
    try {
      hasError.value = false

      const data = await emailVerify({ key })

      if (data && [200, 401].includes(data.status)) {
        toast.add({
          title: t('auth.email.verified'),
          description: options.successDescription(),
          color: 'success',
          icon: options.successIcon,
        })

        await router.push(localePath('account'))
      }
    }
    catch (error) {
      hasError.value = true
      handleAllAuthClientError(error)
    }
  }

  const onSubmit = (event: FormSubmitEvent<z.output<typeof schema>>) => verify(event.data.key)

  watch(codeString, (newCode) => {
    if (newCode.length === 6) verify(newCode)
  })

  return { code, codeString, hasError, schema, onSubmit }
}
