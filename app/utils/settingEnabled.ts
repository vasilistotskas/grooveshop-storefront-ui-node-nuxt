/**
 * Read a boolean merchant extra-setting from OUTSIDE a component.
 *
 * `useSettingFlag` is the component-side reader — it wraps `useFetch`,
 * so it dedupes across readers and lands in the payload, and it is
 * only ever read from a template. A plugin or a route middleware needs
 * the VALUE before it can decide anything, which `useFetch` cannot
 * give it, so both reached for a raw fetch and `createSettingGate`
 * grew its own copy of the parsing.
 *
 * `useRequestFetch`, not a bare `$fetch`: it forwards the incoming
 * host during SSR, and without it Django resolves the PUBLIC schema's
 * value for every tenant (the N1 pattern in MULTI_TENANT_AUDIT.md).
 *
 * Fails to `fallback` on any error. Every current caller passes
 * `true` — an unreachable settings endpoint must not take a feature
 * down for the stores that have it enabled.
 */
export async function settingEnabled(
  key: string,
  fallback: boolean,
): Promise<boolean> {
  const requestFetch = useRequestFetch()
  try {
    const setting = await requestFetch<{ value?: string }>(
      '/api/settings/get',
      { query: { key } },
    )
    const raw = (setting?.value ?? String(fallback)).toString().toLowerCase()
    // The same truthiness `useSettingFlag` accepts. The gate used to
    // test `=== 'true'` alone, so a setting stored as `1` or `yes`
    // 404'd the page it was meant to enable.
    return raw === 'true' || raw === '1' || raw === 'yes'
  }
  catch {
    return fallback
  }
}
