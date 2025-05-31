export function isErrorWithDetail(error: unknown): error is ErrorWithDetail {
  if (typeof error === 'object' && error !== null) {
    const errRecord = error as Record<string, unknown>
    if ('data' in errRecord && typeof errRecord.data === 'object' && errRecord.data !== null) {
      const data = errRecord.data as Record<string, unknown>
      if ('data' in data && typeof data.data === 'object' && data.data !== null) {
        const innerData = data.data as Record<string, unknown>
        return 'detail' in innerData && typeof innerData.detail === 'string'
      }
    }
  }
  return false
}

export function isAllAuthClientError(error: unknown): error is AllAuthClientError {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return false
  }

  return isBadResponseError(error.data) || isNotAuthenticatedResponseError(error.data)
    || isInvalidSessionResponseError(error.data) || isForbiddenResponseError(error.data)
    || isNotFoundResponseError(error.data) || isConflictResponseError(error.data)
}

export const handleAllAuthClientError = (error: unknown): void => {
  const { t } = useNuxtApp().$i18n
  if (isAllAuthClientError(error)) {
    const toast = useToast()

    const errors = 'errors' in error.data.data ? error.data.data.errors : []
    errors.forEach((error) => {
      toast.add({
        title: t(`api_validation.${error.code}`),
        color: 'error',
      })
    })

    if (isBadResponseError(error.data)) {
      console.error('Bad response:', error.data)
    }
    else if (isNotAuthenticatedResponseError(error.data)) {
      const flows = getPendingFlows(error.data.data)
      console.info('Pending flows:', flows)
      if (!flows) {
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
      console.error('Invalid session:', error.data)
    }
    else if (isForbiddenResponseError(error.data)) {
      console.error('Forbidden:', error.data)
    }
    else if (isNotFoundResponseError(error.data)) {
      console.error('Not found:', error.data)
    }
    else if (isConflictResponseError(error.data)) {
      console.error('Conflict:', error.data)
    }
    else {
      console.error('Unknown error:', error)
    }
  }
}
