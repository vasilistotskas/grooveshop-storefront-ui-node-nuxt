/**
 * Boolean merchant toggle from Django's ``extra_settings``
 * (``/api/settings/get`` — key must be in ``PUBLIC_SETTING_KEYS``).
 *
 * The ONE way to read a UI/feature flag on the storefront — replaces
 * the per-component ``useFetch('/api/settings/get')`` boilerplate.
 *
 * - ``fallback`` decides fail-open vs fail-closed: shopper-facing
 *   chrome (nav, add-to-cart) fails OPEN so a settings hiccup never
 *   hides core UX; commercial features (promotions, gift cards) fail
 *   CLOSED so nothing leaks while disabled.
 * - ``server: false`` keeps a flag off the SSR critical path when the
 *   gated element is client-only anyway (chat widget, localStorage
 *   rails) — the fetch reconciles after hydration.
 * - The shared ``setting-flag:<KEY>`` key dedupes concurrent readers
 *   of the same flag into a single request per render.
 *
 * Not awaited by design: the value is only read in templates, and on
 * SSR Nuxt settles ``useFetch`` before render (usePageConfig.ts has
 * the long-form rationale).
 */
export function useSettingFlag(
  key: string,
  options: { fallback: boolean, server?: boolean },
) {
  const fallbackValue = { value: String(options.fallback) }
  const { data } = useFetch<{ value?: string }>('/api/settings/get', {
    key: `setting-flag:${key}`,
    query: { key },
    server: options.server ?? true,
    default: () => fallbackValue,
  })

  return computed(() => {
    const raw = (data.value?.value ?? String(options.fallback))
      .toString()
      .toLowerCase()
    return raw === 'true' || raw === '1' || raw === 'yes'
  })
}
