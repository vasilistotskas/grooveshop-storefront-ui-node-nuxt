import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * Confirming the one-time sign-in code allauth mailed: the pin input's six
 * digits, sent by themselves as the sixth lands. A confirmed code signs the
 * shopper in and goes to the home page. A valid code on an account with
 * two-step verification does not finish the login: allauth consumes it and
 * answers 401 with `mfa_authenticate` pending, which is not an invalid
 * code, so the shopper moves on to the second-factor challenge.
 * `onConfirmed` runs once the shopper is signed in.
 */
export function useLoginCodeConfirm(options: { welcome: () => ToastInput, onConfirmed: () => void }) {
  const { t } = useNuxtApp().$i18n
  const { confirmLoginCode } = useAllAuthAuthentication()
  const toast = useToast()
  const localePath = useLocalePath()
  const router = useRouter()

  // Race-free reference for tryAdvanceToPendingFlow (see app/utils/auth.ts).
  const formPath = router.currentRoute.value.path

  const hasError = ref(false)
  const code = ref<string[]>([])
  const codeString = computed(() => code.value.join(''))

  const schema = z.object({
    code: z.string()
      .min(1, t('validation.required'))
      .length(6, t('validation.code.length')),
  })
  type Schema = z.output<typeof schema>

  async function onSubmit(event: FormSubmitEvent<Schema>) {
    try {
      hasError.value = false

      await confirmLoginCode({ code: event.data.code })

      toast.add(options.welcome())
      options.onConfirmed()

      await router.push(localePath('index'))
    }
    catch (error) {
      if (await tryAdvanceToPendingFlow(error, { fromPath: formPath })) return
      hasError.value = true
      handleAllAuthClientError(error)
    }
  }

  watch(codeString, (newCode) => {
    if (newCode.length === 6) {
      onSubmit({ data: { code: newCode } } as FormSubmitEvent<Schema>)
    }
  })

  return { code, codeString, hasError, schema, onSubmit }
}
