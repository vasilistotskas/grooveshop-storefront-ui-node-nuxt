/**
 * The saved address the account's edit page is for: its id from the route
 * (`/account/addresses/<id>/edit`) and Django's row for it, in the page's
 * language. Both drawings of the edit page read it here.
 *
 * Call it where `await` is allowed, first in the setup, as it reads the
 * address before returning.
 */
export async function useUserAddress() {
  const route = useRoute()
  const { locale } = useNuxtApp().$i18n

  const addressId = 'id' in route.params ? route.params.id : undefined

  const { data: address } = await useApi(`/api/user/addresses/${addressId}`, {
    key: `address-${addressId}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  })

  return { addressId, address }
}
