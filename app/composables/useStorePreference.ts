/**
 * Boolean merchant preference that is not a store feature — the typed
 * reader of `STORE_PREFERENCES` (`shared/utils/storePreference.ts`),
 * which also says what each one reads as while the settings cannot be
 * fetched. A store FEATURE is read
 * with `useStoreFeature`, never here.
 */
export function useStorePreference(name: StorePreferenceName) {
  return useSettingFlag(name, { fallback: STORE_PREFERENCES[name] })
}

/**
 * The awaitable form for a plugin or route middleware, which needs the
 * value before it can decide anything (see `settingEnabled`).
 */
export function storePreferenceEnabled(name: StorePreferenceName): Promise<boolean> {
  return settingEnabled(name, { fallback: STORE_PREFERENCES[name] })
}
