/**
 * The other ways to reach the store, for the contact page's card in every
 * design: its phone and email (the published merchant identity) and where
 * its offices are (`STORE_OFFICES`, in the page's language), with today's
 * opening hours for the phone line.
 *
 * Every line is the merchant's own data; `hasAny` is false for a store that
 * published none of it, and a design then renders no card rather than an
 * empty one.
 */
export function useContactMethods() {
  const { identity } = useMerchantIdentity()
  const { offices } = useStoreOffices()
  const { hasData, todayHours } = useBusinessHours()

  const phone = computed(() => identity.value?.phone?.trim() ?? '')
  const email = computed(() => identity.value?.email?.trim() ?? '')

  const places = computed(() => offices.value.map(office => ({
    key: `${office.label}:${office.street}`,
    title: [office.street, office.area].filter(Boolean).join(', ') || office.addressLine,
    detail: [office.postal, office.city].filter(Boolean).join(' '),
  })))

  return {
    phone,
    email,
    places,
    /** Today's hours, once the page is mounted (the clock is the visitor's); `null` before. */
    todayHours: computed(() => hasData.value ? todayHours.value : null),
    hasAny: computed(() => !!(phone.value || email.value || places.value.length)),
  }
}
