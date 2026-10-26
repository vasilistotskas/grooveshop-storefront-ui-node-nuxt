import * as z from 'zod'

/**
 * The shopper's email addresses and what can be done to them: add one,
 * resend its verification, make it the primary, remove it. Every change is
 * allauth's (`useAllAuthAccount`), and the list is read back from it
 * afterwards. Shared by every drawing of the section
 * (`Account/EmailManage` and the tenants' own).
 *
 * One change at a time: `busy` names the one in flight (`add`,
 * `resend:<email>`, ...), so a drawing can disable its actions. Each
 * action reports whether it went through, after toasting `messages()`
 * (the drawing's own words); a failure is allauth's, through
 * `handleAllAuthClientError`. Call it where `await` is allowed, first in
 * the setup, as it reads the list before returning.
 */
export async function useEmailAddresses(options: {
  messages: () => { added: string, resent: string, madePrimary: string, removed: string }
}) {
  const {
    getEmailAddresses,
    addEmailAddress,
    requestEmailVerification,
    removeEmailAddress,
    changePrimaryEmailAddress,
  } = useAllAuthAccount()
  const toast = useToast()
  const { t } = useNuxtApp().$i18n

  const busy = ref<string | null>(null)

  const schema = z.object({
    email: z.email({
      error: issue => issue.input === undefined ? t('validation.required') : t('validation.email.valid'),
    }),
  })

  async function run(key: string, request: () => Promise<unknown>, done: () => string, reload = true) {
    busy.value = key
    try {
      await request()
      if (reload) await refresh()
      toast.add({ title: done(), color: 'success' })
      return true
    }
    catch (error) {
      handleAllAuthClientError(error)
      return false
    }
    finally {
      busy.value = null
    }
  }

  const add = (email: string) => run('add', () => addEmailAddress({ email }), () => options.messages().added)
  // Resending changes nothing in the list, so it is not read back.
  const resend = (email: string) => run(`resend:${email}`, () => requestEmailVerification({ email }), () => options.messages().resent, false)
  const makePrimary = (email: string) => run(`primary:${email}`, () => changePrimaryEmailAddress({ email, primary: true }), () => options.messages().madePrimary)
  const remove = (email: string) => run(`remove:${email}`, () => removeEmailAddress({ email }), () => options.messages().removed)

  const { data: addresses, refresh } = await useAsyncData('emailAddresses', () => getEmailAddresses())
  const rows = computed(() => addresses.value?.data ?? [])

  return { rows, busy, schema, add, resend, makePrimary, remove }
}
