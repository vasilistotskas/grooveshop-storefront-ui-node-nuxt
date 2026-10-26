import * as z from 'zod'

/**
 * The email every sign-in, sign-up and code form asks for: required, then
 * a valid address. Allauth validates the address itself; this is the
 * shopper's first answer, in the page's language.
 */
export function useAuthEmailSchema() {
  const { t } = useNuxtApp().$i18n
  return z.email({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.email.valid'),
  })
}
