/**
 * Django's field errors (`apiFieldErrorsOf`) for a toast or an alert: one
 * line per field, its messages after its label from the shared `form.*`
 * i18n namespace (`Τηλέφωνο: …`), else after the raw field name, so an
 * unknown field still surfaces instead of vanishing. Errors that belong to
 * no field (`nonFieldErrors`) are shown bare.
 */
export function formatFieldErrors(
  errors: readonly DescribedFieldError[],
  t: (key: string) => string,
): string {
  const byField = new Map<string, string[]>()
  for (const { name, message } of errors) {
    byField.set(name, [...(byField.get(name) ?? []), message])
  }
  return [...byField]
    .map(([field, messages]) => {
      if (field === 'nonFieldErrors' || field === '') return messages.join(' ')
      const labelKey = `form.${field.replace(/[A-Z]/g, char => `_${char.toLowerCase()}`)}`
      const label = t(labelKey)
      return `${label === labelKey ? field : label}: ${messages.join(' ')}`
    })
    .join('\n')
}

export function isAllAuthClientError(error: unknown): error is AllAuthClientError {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return false
  }

  return isBadResponseError(error.data) || isNotAuthenticatedResponseError(error.data)
    || isInvalidSessionResponseError(error.data) || isForbiddenResponseError(error.data)
    || isNotFoundResponseError(error.data) || isConflictResponseError(error.data)
}

export function isRateLimitedClientError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const err = error as Record<string, unknown>
  // H3Error forwarded from the Nuxt proxy: { data: { statusCode: 429, ... } }
  if ('data' in err && typeof err.data === 'object' && err.data !== null) {
    const data = err.data as Record<string, unknown>
    if ('statusCode' in data && data.statusCode === 429) return true
    // Django allauth rate-limit body forwarded in data.data: { status: 429, ... }
    if ('data' in data && typeof data.data === 'object' && data.data !== null) {
      const inner = data.data as Record<string, unknown>
      if ('status' in inner && inner.status === 429) return true
    }
  }
  // Direct statusCode on error object (e.g. from createError)
  if ('statusCode' in err && err.statusCode === 429) return true
  return false
}

/** allauth's 409: the thing asked for is not pending, or its quota is spent. */
export function isConflictClientError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'data' in error
    && isConflictResponseError(error.data)
}

export const handleAllAuthClientError = (error: unknown): void => {
  const { t, te } = useNuxtApp().$i18n

  if (isRateLimitedClientError(error)) {
    const toast = useToast()
    toast.add({
      title: t('error.rate_limited'),
      color: 'warning',
    })
    log.warn('auth:rateLimited', 'Rate limit hit (429)')
    return
  }

  if (isAllAuthClientError(error)) {
    const toast = useToast()

    const errors = 'errors' in error.data.data ? error.data.data.errors ?? [] : []
    errors.forEach((error) => {
      // Unmapped codes used to render the literal i18n key
      // ("validation.api.password_too_common") — fall back to allauth's
      // own message so every rejection stays readable.
      const key = `validation.api.${error.code}`
      toast.add({
        title: te(key) ? t(key) : (error.message || t('unknown.error')),
        color: 'error',
      })
    })

    if (isBadResponseError(error.data)) {
      log.error({ action: 'allauth:badResponse', error: error.data })
    }
    else if (isNotAuthenticatedResponseError(error.data)) {
      const flows = getPendingFlows(error.data.data)
      log.info({ tag: 'auth', message: 'Pending flows', count: flows.length })
      if (!flows.length) {
        toast.add({
          title: t('auth.error.not_authenticated'),
          color: 'error',
        })
        return
      }
      flows.forEach((flow) => {
        if (flow.id === 'verify_email') {
          toast.add({
            title: t('auth.error.verify_email'),
            color: 'error',
          })
          return
        }
        else if (flow.id === 'mfa_authenticate') {
          toast.add({
            title: t('auth.error.mfa_authenticate'),
            color: 'warning',
          })
          return
        }
      })
    }
    else if (isInvalidSessionResponseError(error.data)) {
      log.error({ action: 'allauth:invalidSession', error: error.data })
    }
    else if (isForbiddenResponseError(error.data)) {
      log.error({ action: 'allauth:forbidden', error: error.data })
    }
    else if (isNotFoundResponseError(error.data)) {
      log.error({ action: 'allauth:notFound', error: error.data })
    }
    else if (isConflictResponseError(error.data)) {
      log.error({ action: 'allauth:conflict', error: error.data })
    }
    else {
      log.error({ action: 'allauth:unknown', error })
    }
  }
}
