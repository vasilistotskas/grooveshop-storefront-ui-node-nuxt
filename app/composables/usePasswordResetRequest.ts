import * as z from 'zod'

/**
 * Asking for the password-reset email, apart from its drawing
 * (`Account/Password/ResetForm` and the tenants' own). Django answers the
 * same whether or not the address has an account, so `request` reports
 * only whether the request went through; what the shopper is told then is
 * the drawing's own.
 */
export function usePasswordResetRequest() {
  const { passwordRequest } = useAllAuthAuthentication()
  const { t } = useNuxtApp().$i18n

  const loading = ref(false)
  const hasError = ref(false)

  const schema = z.object({
    email: z.email({
      error: issue => issue.input === undefined
        ? t('validation.required')
        : t('validation.email.valid'),
    }),
  })

  async function request(email: string): Promise<boolean> {
    try {
      loading.value = true
      hasError.value = false
      await passwordRequest({ email })
      return true
    }
    catch (error) {
      hasError.value = true
      handleAllAuthClientError(error)
      return false
    }
    finally {
      loading.value = false
    }
  }

  return { schema, loading, hasError, request }
}
