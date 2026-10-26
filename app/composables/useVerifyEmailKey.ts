/**
 * Confirming the email from the emailed link
 * (`Storefront/Auth/VerifyEmailKey` and the tenants' own): the link's key
 * is looked up before the page shows (`data`, allauth's answer: the
 * address and the account it belongs to), and `verify` confirms it.
 *
 * allauth answers 401 when the address was confirmed but the request
 * carried no pending session (the link opened on another device or
 * browser). `$fetch` rejects on a 401, so that success only ever surfaces
 * in the catch, and counts as confirmed all the same. Either way the
 * shopper is toasted and goes to the account.
 *
 * `successDescription` is the toast's line in the drawing's own words and
 * `successIcon` dresses it. Call it where `await` is allowed, first in the
 * setup, as it reads the link before returning.
 */
export async function useVerifyEmailKey(options: {
  successDescription: () => string
  successIcon?: string
}) {
  const { emailVerify, getEmailVerify } = useAllAuthAuthentication()
  const toast = useToast()
  const { t } = useNuxtApp().$i18n
  const localePath = useLocalePath()
  const route = useRoute()
  const router = useRouter()

  const loading = ref(false)

  const key = 'key' in route.params ? route.params.key : undefined

  async function confirmed() {
    toast.add({
      title: t('auth.email.verified'),
      description: options.successDescription(),
      color: 'success',
      icon: options.successIcon,
    })
    await router.push(localePath('account'))
  }

  async function verify(): Promise<void> {
    try {
      loading.value = true
      const data = await emailVerify({ key: String(key) })

      if (data && data.status === 200) await confirmed()
    }
    catch (error) {
      if (isAllAuthClientError(error) && error.data.data.status === 401) {
        await confirmed()
        return
      }
      handleAllAuthClientError(error)
    }
    finally {
      loading.value = false
    }
  }

  const { data } = await useAsyncData(
    'verifyEmail',
    () => getEmailVerify(String(key)),
  )

  return { data, loading, verify }
}
