import * as z from 'zod'

/**
 * Making an account with an email and a password. The password rules are
 * Django's `MinimumLengthValidator` (8, its default) and
 * `NumericPasswordValidator` (`AUTH_PASSWORD_VALIDATORS` in the Django
 * settings); the common-password and similarity checks answer from the
 * server. The numeric test is ASCII digits only, narrower than Python's
 * `str.isdigit`, so it never blocks a password the server would accept.
 *
 * `messages` is each drawing's own wording of the email and minimum-length
 * lines; the forms build their schema from `email` and `password`, adding
 * what only they ask for (a second password box, the terms). `signup` makes
 * the account; a signup that needs the email confirmed answers with a
 * pending flow — the account exists, the next step is the code — which
 * `onPendingFlow` hears before the shopper is sent there.
 */
export function useSignup(options: {
  messages: { email: () => string, minimum: (min: number) => string }
  onCreated?: (email: string) => Promise<void>
}) {
  const { t } = useNuxtApp().$i18n
  const { signup: requestSignup } = useAllAuthAuthentication()
  const toast = useToast()

  // Race-free reference for tryAdvanceToPendingFlow (see app/utils/auth.ts).
  const formPath = useRoute().path

  const email = z.email({
    error: issue => issue.input === undefined ? t('validation.required') : options.messages.email(),
  })

  const password = z.string({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : undefined,
  }).min(8, {
    error: issue => options.messages.minimum(Number(issue.minimum)),
  }).refine(value => !/^\d+$/.test(value), {
    error: t('validation.password.entirely_numeric'),
  })

  const isSubmitting = ref(false)

  async function signup(values: { email: string, password: string }) {
    isSubmitting.value = true
    try {
      await requestSignup({ email: values.email, password: values.password })
      await options.onCreated?.(values.email)
      toast.add({ title: t('auth.signup.success'), color: 'success' })
    }
    catch (error) {
      if (pendingFlowRouteNameFromError(error)) {
        await options.onCreated?.(values.email)
      }
      if (await tryAdvanceToPendingFlow(error, { fromPath: formPath })) return
      handleAllAuthClientError(error)
    }
    finally {
      isSubmitting.value = false
    }
  }

  return { email, password, isSubmitting, signup }
}
