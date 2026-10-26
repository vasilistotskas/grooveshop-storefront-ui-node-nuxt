import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * Starting a sign-up by passkey with an email. Allauth answers with the
 * next step pending (creating the passkey, or confirming the email first):
 * that is progress, not a failure (`tryAdvanceToPendingFlow`). `created`
 * is an optional toast for a request that went through without a pending
 * step; `onSignedUp` runs then.
 */
export function useSignUpByPasskey(options: { created?: () => ToastInput, onSignedUp: () => void }) {
  const { signUpByPasskey } = useAllAuthAuthentication()
  const toast = useToast()

  // Race-free reference for tryAdvanceToPendingFlow (see app/utils/auth.ts).
  const formPath = useRoute().path

  const loading = ref(false)
  const hasError = ref(false)

  const schema = z.object({ email: useAuthEmailSchema() })
  type Schema = z.output<typeof schema>

  const state = reactive<Partial<Schema>>({ email: undefined })

  async function onSubmit(event: FormSubmitEvent<Schema>): Promise<void> {
    try {
      loading.value = true
      hasError.value = false

      await signUpByPasskey(event.data)

      if (options.created) toast.add(options.created())
      options.onSignedUp()
    }
    catch (error) {
      if (await tryAdvanceToPendingFlow(error, { fromPath: formPath })) return
      hasError.value = true
      handleAllAuthClientError(error)
    }
    finally {
      loading.value = false
    }
  }

  return { schema, state, loading, hasError, onSubmit }
}
