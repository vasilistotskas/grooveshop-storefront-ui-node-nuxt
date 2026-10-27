import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * Creating the passkey a sign-up by passkey waits for, apart from its
 * drawing (`Account/Signup/CreatePasskeyForm` and the tenants' own): the
 * device's name (one to fifty characters), allauth's creation options,
 * the browser's credential and its registration. `created` is the
 * drawing's toast once the passkey is registered; `onCreated` runs then.
 *
 * When allauth no longer has that step pending (409, or another flow is
 * pending now) the shopper goes back to the start of the passkey sign-up;
 * any other refusal is allauth's, through `handleAllAuthClientError`.
 * One registration at a time (`isSubmitting`).
 */
export function useCreatePasskeyAtSignup(options: {
  t: ReturnType<typeof useI18n>['t']
  created: () => ToastInput
  onCreated: () => void
}) {
  const { t } = options
  const { getWebAuthnCreateOptionsAtSignup, signupWebAuthnCredential } = useAllAuthAuthentication()
  const toast = useToast()
  const localePath = useLocalePath()
  const authInfo = useAuthInfo()
  const router = useRouter()

  const hasError = ref(false)
  const isSubmitting = ref(false)
  const deviceName = ref('')

  const schema = z.object({
    name: z.string()
      .min(1, t('validation.required'))
      .max(50, t('validation.max', { max: 50 })),
  })

  type Schema = z.output<typeof schema>

  async function onSubmit(event: FormSubmitEvent<Schema>): Promise<void> {
    if (isSubmitting.value) return
    isSubmitting.value = true
    try {
      hasError.value = false

      const optResp = await getWebAuthnCreateOptionsAtSignup()
      const jsonOptions = optResp?.data.request_options.publicKey

      if (!jsonOptions) {
        throw new Error('No creation options')
      }

      const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(jsonOptions)
      const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential

      await signupWebAuthnCredential({
        name: event.data.name,
        credential: credential.toJSON(),
      })

      toast.add(options.created())
      options.onCreated()
    }
    catch (error) {
      if (isAllAuthClientError(error)) {
        if (error.data.data.status === 409 || authInfo.pendingFlow?.id !== Flows.MFA_WEBAUTHN_SIGNUP) {
          await router.push(localePath('account-signup-passkey'))
          return
        }
      }
      hasError.value = true
      handleAllAuthClientError(error)
    }
    finally {
      isSubmitting.value = false
    }
  }

  return { schema, deviceName, hasError, isSubmitting, onSubmit }
}
