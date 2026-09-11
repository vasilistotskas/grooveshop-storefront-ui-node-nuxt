/**
 * Boolean merchant toggle from Django's ``extra_settings``
 * (key must be in ``PUBLIC_SETTING_KEYS``).
 *
 * The ONE way to read a UI/feature flag on the storefront. Reads off
 * the single per-render settings payload (``useStoreSettings``) — no
 * request of its own, however many components ask.
 *
 * ``fallback`` decides fail-open vs fail-closed: shopper-facing chrome
 * (nav, add-to-cart) fails OPEN so a settings hiccup never hides core
 * UX; commercial features (promotions, gift cards) fail CLOSED so
 * nothing leaks while disabled. The truthiness rule is
 * ``parseSettingFlag`` — shared with the route gates and the server.
 */
export function useSettingFlag(key: string, options: { fallback: boolean }) {
  const { settings } = useStoreSettings()
  return computed(() => parseSettingFlag(settings.value[key], options.fallback))
}
