import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * Setting a new password from the emailed reset link, apart from its
 * drawing (`Account/Password/ResetConfirmForm` and the tenants' own).
 *
 * The link's key comes from the route; without one the shopper is sent
 * to ask for a new link, and a key is looked up before the form shows
 * (`passwordReset` async data). The schema mirrors Django's
 * AUTH_PASSWORD_VALIDATORS where a pure function can (MinimumLength 8 and
 * NumericPassword); CommonPassword and UserAttributeSimilarity stay
 * server-side and surface through the translated allauth error codes. The
 * strength meter is advisory and never gates.
 *
 * `mismatch` is the "the two passwords differ" sentence and
 * `successDescription` the success toast's line, each in the drawing's own
 * words; `successIcon` dresses that toast. Call it where `await` is
 * allowed, first in the setup, as it reads the link before returning.
 */
export async function usePasswordResetConfirm(options: {
  mismatch: () => string
  successDescription: () => string
  successIcon?: string
}) {
  const { getPasswordReset, passwordReset } = useAllAuthAuthentication()
  const { t } = useNuxtApp().$i18n
  const route = useRoute()
  const toast = useToast()
  const { notify } = useApiError()
  const localePath = useLocalePath()
  const router = useRouter()

  const key = 'key' in route.params ? route.params.key : undefined

  const hasError = ref(false)
  const isSubmitting = ref(false)

  const newPassword1 = ref('')
  const newPassword2 = ref('')

  const schema = z.object({
    newPassword1: z.string()
      .min(8, t('validation.min', { min: 8 }))
      .max(255)
      .refine(value => !/^\d+$/.test(value), {
        error: t('validation.password.entirely_numeric'),
      }),
    newPassword2: z.string()
      .min(8, t('validation.min', { min: 8 }))
      .max(255),
    key: z.string(),
  }).refine(data => data.newPassword1 === data.newPassword2, {
    message: options.mismatch(),
    path: ['newPassword2'],
  })

  type Schema = z.output<typeof schema>

  async function onSubmit(event: FormSubmitEvent<Schema>): Promise<void> {
    if (isSubmitting.value) return
    isSubmitting.value = true
    try {
      hasError.value = false
      await passwordReset({
        password: event.data.newPassword1,
        key: event.data.key,
      })
      toast.add({
        title: t('password.reset.success'),
        description: options.successDescription(),
        color: 'success',
        icon: options.successIcon,
      })
      await router.push(localePath('account-login'))
    }
    catch (error) {
      if (isAllAuthClientError(error)) {
        // allauth answers a reset that went through without signing the
        // shopper in with a 401: the password changed, sign in with it.
        if (error.data.data.status === 401) {
          toast.add({
            title: t('password.reset.success'),
            color: 'success',
          })
          await navigateTo(localePath('account-login'))
          return
        }
        const errors = 'errors' in error.data.data ? error.data.data.errors : []
        errors.forEach((error) => {
          toast.add({
            title: error.message,
            color: 'error',
          })
        })
        return
      }
      hasError.value = true
      notify('password-reset:confirm', error, { title: t('error.default') })
    }
    finally {
      isSubmitting.value = false
    }
  }

  if (!key) {
    navigateTo(localePath('account-password-reset'))
  }

  await useAsyncData('passwordReset', () => getPasswordReset(String(key)))

  return { key, hasError, isSubmitting, newPassword1, newPassword2, schema, onSubmit }
}
