import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * Asking for a one-time sign-in code by email. Allauth accepts the request
 * and emails the code (`RequestLoginCodeView.post`,
 * `headless/account/views.py`), then signals the next step as a 401 with
 * `login_by_code` pending, which the app's fetch throws: that is success,
 * not a failure, so the shopper moves on to the confirm step
 * (`tryAdvanceToPendingFlow`) and is told the code is on its way
 * (`sent`). `onRequested` runs either way.
 */
export function useLoginCodeRequest(options: { sent: () => ToastInput, onRequested: () => void }) {
  const { requestLoginCode } = useAllAuthAuthentication()
  const toast = useToast()

  // Race-free reference for tryAdvanceToPendingFlow (see app/utils/auth.ts).
  const formPath = useRoute().path

  const loading = ref(false)
  const hasError = ref(false)

  const schema = z.object({ email: useAuthEmailSchema() })
  type Schema = z.output<typeof schema>

  const state = reactive<Partial<Schema>>({ email: undefined })

  async function onSubmit(event: FormSubmitEvent<Schema>) {
    try {
      loading.value = true
      hasError.value = false
      await requestLoginCode(event.data)

      toast.add(options.sent())
      options.onRequested()
    }
    catch (error) {
      if (await tryAdvanceToPendingFlow(error, { fromPath: formPath })) {
        toast.add(options.sent())
        options.onRequested()
        return
      }
      hasError.value = true
      handleAllAuthClientError(error)
    }
    finally {
      loading.value = false
    }
  }

  return { schema, state, loading, hasError, onSubmit }
}
