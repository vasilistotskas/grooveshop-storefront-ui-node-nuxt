/**
 * The one way a component tells the shopper that an `/api` call failed.
 *
 * `describe` reads the failure (`describeApiError`); `notify` toasts it:
 * the action's headline, the server's reason, and behind «Λεπτομέρειες»
 * the stable code and the request id. The toast id is the action's, so a
 * repeated failure pulses the toast it already shows instead of stacking
 * (Nuxt UI 4.5+: `add` with an existing id merges).
 *
 * Composables and stores use `describeApiError` directly with a toast of
 * their own; this is for setup scope.
 */
export function useApiError() {
  const toast = useToast()
  const { t } = useNuxtApp().$i18n

  function describe(error: unknown, options: DescribeApiErrorOptions = {}): DescribedApiError {
    return describeApiError(error, options)
  }

  /** The code and request id as lines of text, or `''` when there is neither. */
  function detailsOf(described: DescribedApiError): string {
    return [
      described.code ? `${t('error.code_label')}: ${described.code}` : '',
      described.requestId ? `${t('error.request_id_label')}: ${described.requestId}` : '',
    ].filter(Boolean).join(' · ')
  }

  /**
   * Toast the failure under `id` (one per action). `title` is the action's
   * headline («Η κριτική δεν δημιουργήθηκε»); the description is the
   * server's reason. Returns what it described, for a caller that also
   * marks fields.
   */
  function notify(id: string, error: unknown, options: DescribeApiErrorOptions = {}): DescribedApiError {
    const described = describeApiError(error, options)
    const details = detailsOf(described)
    toast.add({
      id,
      title: described.title,
      description: described.description,
      color: 'error',
      ...(details
        ? {
            actions: [{
              label: t('error.details'),
              color: 'neutral' as const,
              variant: 'outline' as const,
              onClick: (event?: Event) => {
                // Keep the toast open: the click reveals, it does not dismiss.
                event?.stopPropagation()
                toast.update(id, { description: `${described.description} (${details})`, actions: [], duration: 0 })
              },
            }],
          }
        : {}),
    })
    return described
  }

  return { describe, notify, detailsOf }
}
