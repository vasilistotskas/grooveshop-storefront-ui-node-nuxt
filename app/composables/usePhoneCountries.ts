/**
 * Every country that has a dial code — the phone picker's list, whatever
 * the store ships to. ONE key for every reader (the picker, the checkout
 * schema, the address-book and profile forms), so a page fetches it once
 * and serialises it once.
 *
 * Unpaginated on purpose: DRF caps a page at 100 rows and the table
 * carries ~250 (see `server/api/countries/index.get.ts`). Names come in
 * the page locale; the picker lists them with `extractTranslated`.
 */
export function usePhoneCountries() {
  const { $i18n } = useNuxtApp()

  return useApi('/api/countries', {
    key: 'countries-phone',
    dedupe: 'defer',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: $i18n.locale,
      hasPhoneCode: true,
      pagination: 'false',
    },
  })
}
