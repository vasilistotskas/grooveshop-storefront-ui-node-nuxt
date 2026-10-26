import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * Signing in with email and password: the form's schema and state, and the
 * one login path. `performLogin` can be driven with credentials a caller
 * already has (the demo-account strip on the sign-in page) without a second
 * copy of the pending-flow handling, the cart refresh and the `next`
 * bookkeeping.
 *
 * A correct password on an account with two-step verification does not
 * sign the shopper in outright: allauth answers 401 with `mfa_authenticate`
 * pending, which is not a failure and sends the shopper to the
 * second-factor challenge.
 */
export function useLogin() {
  const { t } = useNuxtApp().$i18n
  const { login } = useAllAuthAuthentication()
  const router = useRouter()
  const { refreshCart } = useCartStore()
  const { session } = storeToRefs(useAuthStore())

  // Captured at setup — the race-free reference point for
  // tryAdvanceToPendingFlow (the auth:change hook may navigate before our
  // catch runs, so the live route is not trustworthy there).
  const formPath = router.currentRoute.value.path

  const isSubmitting = ref(false)

  const schema = z.object({
    email: useAuthEmailSchema(),
    password: z.string({ error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid') }).min(1, {
      error: t('validation.required'),
    }),
  })

  type Schema = z.output<typeof schema>

  const state = reactive<Partial<Schema>>({
    email: undefined,
    password: undefined,
  })

  const performLogin = async (email: string, password: string) => {
    isSubmitting.value = true
    try {
      const currentPath = router.currentRoute.value.path
      const currentQuery = router.currentRoute.value.query

      if (!currentQuery.next) {
        await router.replace({ query: { next: currentPath } })
      }

      const response = await login({ email, password })

      session.value = response?.data
    }
    catch (error) {
      if (await tryAdvanceToPendingFlow(error, { fromPath: formPath })) return
      handleAllAuthClientError(error)
    }
    finally {
      await refreshCart()
      isSubmitting.value = false
    }
  }

  const onSubmit = (event: FormSubmitEvent<Schema>) => performLogin(event.data.email, event.data.password)

  return { schema, state, isSubmitting, performLogin, onSubmit }
}
