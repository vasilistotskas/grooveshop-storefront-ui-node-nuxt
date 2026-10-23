/**
 * Boolean merchant toggle from Django's ``extra_settings``
 * (key must be in ``PUBLIC_SETTING_KEYS``).
 *
 * The raw reader under ``useStorePreference`` (the typed accessor for
 * the settings that are not store features — read THAT in app code)
 * and the frozen webside tree. A store FEATURE is never read here:
 * ``useStoreFeature`` answers it from ``TenantConfig.features``. Reads
 * off the single per-render settings payload (``useStoreSettings``) —
 * no request of its own, however many components ask.
 *
 * ``fallback`` is the answer when the settings could not be fetched:
 * Django sends every public key, the store's value or the declared one,
 * so a key is absent only then. The truthiness rule is
 * ``parseSettingFlag`` — shared with the route gates and the server.
 */
export function useSettingFlag(key: string, options: { fallback: boolean }) {
  const { settings } = useStoreSettings()
  return computed(() => parseSettingFlag(settings.value[key], options.fallback))
}
