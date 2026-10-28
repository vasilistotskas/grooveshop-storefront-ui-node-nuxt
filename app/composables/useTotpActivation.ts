import DOMPurify from 'isomorphic-dompurify'
import * as z from 'zod'

/**
 * Turning the authenticator app on: allauth's secret and its QR code
 * (`GET authenticators/totp/svg`, which allauth answers with a 404 that
 * carries the secret while no app is set up: `ManageTOTPView.get`,
 * `headless/mfa/views.py`; the shopper goes back to the Security page when the
 * request fails), the six digits typed from the app, and the activation.
 * `messages` is each drawing's own wording.
 *
 * The code is six digits, as allauth is configured to make them
 * (`MFA_TOTP_DIGITS`, the Django settings). A cell filled with the digit
 * zero counts as filled, by reka-ui's own rule: a "falsy is empty" test
 * kept the button disabled for every code containing a zero.
 *
 * Awaited in `<script setup>`; `activate()` resolves `true` once the app
 * is linked.
 */
export async function useTotpActivation(options: {
  messages: {
    codeLength: () => string
    codeNumeric: () => string
    invalidTitle: () => string
    copied: () => string
    activated: () => ToastInput
  }
}) {
  const nuxtApp = useNuxtApp()
  const { activateTotp, totpAuthenticatorStatus } = useAllAuthAccount()
  const toast = useToast()
  const localePath = useLocalePath()
  const { copy, isSupported } = useClipboard()

  const loading = ref(false)
  const code = ref<number[]>([])

  const { data, error, status } = await useAsyncData(
    'totpAuthenticatorStatus',
    () => totpAuthenticatorStatus(),
    {
      getCachedData(key) {
        return nuxtApp.payload.data[key] || nuxtApp.static.data[key]
      },
    },
  )

  const meta = computed(() => data.value && 'meta' in data.value ? data.value.meta : undefined)
  const totpSecret = computed(() => meta.value?.secret ?? '')
  const totpSvg = computed(() =>
    meta.value ? DOMPurify.sanitize(meta.value.totp_svg ?? '', { USE_PROFILES: { svg: true } }) : '',
  )

  watchEffect(async () => {
    if (error.value) {
      await navigateTo(localePath('account-security'))
    }
  })

  const isCodeComplete = computed(() =>
    code.value.filter(digit => digit === 0 || !!digit).length === 6,
  )

  const codeSchema = computed(() => z.string()
    .min(6, { message: options.messages.codeLength() })
    .max(6, { message: options.messages.codeLength() })
    .regex(/^\d+$/, { message: options.messages.codeNumeric() }),
  )

  function copySecret() {
    if (!isSupported.value) return
    copy(totpSecret.value)
    toast.add({ title: options.messages.copied(), color: 'success' })
  }

  async function activate(): Promise<boolean> {
    try {
      const codeString = code.value.join('')
      const validation = codeSchema.value.safeParse(codeString)

      if (!validation.success) {
        toast.add({
          title: options.messages.invalidTitle(),
          description: validation.error.issues[0]?.message,
          color: 'error',
        })
        return false
      }

      loading.value = true
      await activateTotp({ code: codeString })
      toast.add(options.messages.activated())
      await navigateTo(localePath('account-security'))
      return true
    }
    catch (failure) {
      handleAllAuthClientError(failure)
      return false
    }
    finally {
      loading.value = false
    }
  }

  return { status, isSupported, totpSecret, totpSvg, code, loading, isCodeComplete, copySecret, activate }
}
