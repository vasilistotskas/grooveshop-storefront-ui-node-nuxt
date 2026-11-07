/**
 * Whether the visitor agreed to `personalization_storage`, the category for
 * what a browser keeps only to tailor the store to them: the products they
 * viewed and what they searched for. Storing it is not needed for the page they
 * asked for, so nothing is stored or read without this answer, and
 * `app/plugins/personalization-storage.client.ts` removes it when the answer is
 * no. `functionality_storage` is no home for it: that one is necessary, and on
 * after a rejection too.
 */
export function usePersonalizationConsent() {
  const { cookiesEnabledIds, isConsentGiven } = useCookieControl()
  return computed(() => !!(
    isConsentGiven.value
    && cookiesEnabledIds.value?.includes('personalization_storage')
  ))
}
