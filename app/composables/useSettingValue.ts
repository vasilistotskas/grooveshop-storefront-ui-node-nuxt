/**
 * String merchant setting from Django's ``extra_settings``
 * (``/api/settings/get`` — key must be in ``PUBLIC_SETTING_KEYS``).
 *
 * The non-boolean sibling of ``useSettingFlag`` — same dedup and
 * fail-soft contract: any fetch problem resolves to ``''`` and the
 * consumer renders nothing.
 */
export function useSettingValue(key: string, options?: { server?: boolean }) {
  const { data } = useFetch<{ value?: string }>('/api/settings/get', {
    key: `setting-value:${key}`,
    query: { key },
    server: options?.server ?? true,
    default: () => ({ value: '' }),
  })

  return computed(() => data.value?.value ?? '')
}
