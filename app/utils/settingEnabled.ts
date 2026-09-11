/**
 * Read a boolean merchant extra-setting from OUTSIDE a component.
 *
 * `useSettingFlag` is the component-side reader; a plugin or a route
 * middleware needs the VALUE before it can decide anything, so it
 * reads the same per-render payload through `fetchStoreSettings`
 * (already in the payload on the client, one tenant-cached internal
 * request on the server) and applies the shared `parseSettingFlag`
 * rule.
 *
 * Two fallbacks, because a gate distinguishes two absences:
 *
 * - `fallback` — the setting has NO row. Shopper chrome ships ON, so
 *   its gates pass `true`; a commercial feature ships OFF, so its
 *   gates pass `false` and nothing leaks while disabled.
 * - `onError` — the settings endpoint could not be read at all.
 *   Defaults to `fallback`; the commercial gates pass `true` here
 *   because an unavailable endpoint must not take a feature down for
 *   the stores whose plan enables it (loyalty-enabled.ts rationale).
 */
export async function settingEnabled(
  key: string,
  options: { fallback: boolean, onError?: boolean },
): Promise<boolean> {
  try {
    const { settings } = await fetchStoreSettings()
    return parseSettingFlag(settings[key], options.fallback)
  }
  catch {
    return options.onError ?? options.fallback
  }
}
