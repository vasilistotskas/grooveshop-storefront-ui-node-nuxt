import * as z from 'zod'

/**
 * The last step of signing up through a social provider: the email the
 * account will use (the provider's, editable) and the terms. `success` is the
 * toast once allauth has the address; `onSignedUp` runs then.
 *
 * `acceptedTerms` is the terms checkbox, which the drawing binds. `submit`
 * itself refuses without it, so a submit that does not come from the
 * (disabled) button, such as `form.requestSubmit()`, cannot make an account.
 */
export function useProviderSignup(options: { success: () => ToastInput, onSignedUp: () => void }) {
  const { providerSignup } = useAllAuthAuthentication()
  const toast = useToast()

  const loading = ref(false)
  const acceptedTerms = ref(false)

  const schema = z.object({ email: useAuthEmailSchema() })
  const state = reactive<Partial<z.output<typeof schema>>>({ email: undefined })

  async function submit(values: { email: string }) {
    if (!acceptedTerms.value) return
    try {
      loading.value = true
      await providerSignup(values)
      toast.add(options.success())
      options.onSignedUp()
    }
    catch (error) {
      handleAllAuthClientError(error)
    }
    finally {
      loading.value = false
    }
  }

  return { schema, state, loading, acceptedTerms, submit }
}
