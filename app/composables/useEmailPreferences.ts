/**
 * The signed-in customer's "Store emails": the marketing emails the store
 * sends without a topic subscription (basket reminder, product alerts, "We
 * miss you"), apart from their drawing (`Account/subscriptions/StoreEmailsList`
 * and the tenants' own).
 *
 * This is the one place a customer takes an opt-out back: the unsubscribe
 * page and the mail program's button only record one, and staff cannot
 * lift it. Turning a type on lifts the opt-out that covers it, including
 * an "all marketing emails" one, and leaves the other choices as they are.
 *
 * The titles come translated from Django, so the data is keyed by locale.
 * One change at a time: `saving` names the type in flight. A refusal reads
 * the list again, so each switch shows what is true rather than what was
 * asked.
 */
export function useEmailPreferences() {
  const toast = useToast()
  const { notify } = useApiError()
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  const { data, status, error, refresh } = useApi('/api/user/email-preferences', {
    key: () => `emails:preferences:${$i18n.locale.value}`,
  })

  const types = computed(() => data.value?.types ?? [])
  const saving = ref<string | null>(null)

  async function setEnabled(key: string, enabled: boolean) {
    if (saving.value) return
    saving.value = key
    try {
      data.value = await $api('/api/user/email-preferences', {
        method: 'PATCH',
        body: { types: [{ key, enabled }] },
      })
      const outcome = enabled ? 'enabled' : 'disabled'
      toast.add({
        title: t(`email_preferences_notifications.${outcome}_title`),
        description: t(`email_preferences_notifications.${outcome}_description`),
        color: 'success',
      })
    }
    catch (err) {
      await refresh()
      notify('emails:preferences', err, {
        title: t('email_preferences_notifications.error_title'),
        fallback: t('email_preferences_notifications.error_description'),
      })
    }
    finally {
      saving.value = null
    }
  }

  return { types, status, error, refresh, saving, setEnabled }
}
