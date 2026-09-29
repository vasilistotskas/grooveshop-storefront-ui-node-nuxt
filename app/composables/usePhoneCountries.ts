/**
 * Every country that has a dial code — the phone picker's list, whatever
 * the store ships to. ONE key for every reader (the picker, the checkout
 * schema, the address-book and profile forms), so a page fetches it once
 * and serialises it once.
 *
 * Unpaginated on purpose: DRF caps a page at 100 rows and the table
 * carries ~250 (see `server/api/countries/index.get.ts`).
 *
 * No locale in the key or the query: every country carries all its
 * translations whatever `languageCode` says (checked 2026-09-29), and
 * readers pick a name with `extractTranslated` — same as
 * `useAllCategories`. A locale-dependent query would refetch identical
 * data on a language switch, and a pending request deduped under the
 * one key could still answer for the old locale.
 */
export function usePhoneCountries() {
  return useApi('/api/countries', {
    key: 'countries-phone',
    dedupe: 'defer',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      hasPhoneCode: true,
      pagination: 'false',
    },
  })
}
