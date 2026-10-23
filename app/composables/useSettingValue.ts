/**
 * String merchant setting from Django's ``extra_settings`` (key must
 * be in ``PUBLIC_SETTING_KEYS``). A store feature or preference is never
 * read here: ``useStoreFeature`` / ``useStorePreference`` answer those
 * from ``TenantConfig``.
 *
 * Reads the single per-render payload (``useStoreSettings``), fail-soft:
 * Django sends every public key, so ``''`` means the settings could not
 * be fetched (or the value is empty), and the consumer renders nothing.
 */
export function useSettingValue(key: string) {
  const { settings } = useStoreSettings()
  return computed(() => settings.value[key] ?? '')
}
