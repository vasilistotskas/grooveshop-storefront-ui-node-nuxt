/**
 * String merchant setting from Django's ``extra_settings`` (key must
 * be in ``PUBLIC_SETTING_KEYS``).
 *
 * The non-boolean sibling of ``useSettingFlag``: same single
 * per-render payload (``useStoreSettings``), same fail-soft contract —
 * a missing key or a fetch problem resolves to ``''`` and the consumer
 * renders nothing.
 */
export function useSettingValue(key: string) {
  const { settings } = useStoreSettings()
  return computed(() => settings.value[key] ?? '')
}
