/** The visitor's answer on personalisation, as the banners leave it. */
export function setPersonalizationConsent(on: boolean) {
  const { cookiesEnabledIds, isConsentGiven } = useCookieControl()
  isConsentGiven.value = on
  cookiesEnabledIds.value = on ? ['n', 'personalization_storage'] : ['n']
}
