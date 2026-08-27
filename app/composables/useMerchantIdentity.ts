/**
 * The merchant's published legal identity.
 *
 * Every field here is information the seller is *obliged* to make
 * public — e-Commerce Directive 2000/31/EC art. 5(1) and, for Greek
 * merchants, N. 4919/2022 art. 22 §3-4 (legal form, name, registered
 * seat, GEMI number, and liquidation status where it applies, all
 * "σε εμφανές σημείο"). Art. 50(γ) fines omission €200-500.
 *
 * A store that has filled none of it in renders nothing rather than an
 * empty scaffold: a heading over blank rows reads as a broken page, and
 * is no more compliant than showing nothing. `isComplete` is what tells
 * the merchant they still have to act — surfaced in the admin, not to
 * shoppers.
 */
export function useMerchantIdentity() {
  const { data } = useFetch('/api/tenant/legal-identity', {
    key: 'tenant-legal-identity',
    // A store mid-onboarding has published nothing yet; that is the
    // normal state, not an error, so the failure is swallowed and the
    // block simply does not render.
    default: () => null,
  })

  /**
   * True once there is a real disclosure to make, not merely a name.
   *
   * `INVOICE_SELLER_NAME` is populated on stores that have done nothing
   * about disclosure — it is filled in for invoicing, and webside had
   * exactly it and nothing else. Rendering on the name alone puts a
   * lone company name in an <address> block, which discloses nothing a
   * shopper cannot already read off the site and looks like a bug.
   *
   * So: a name AND at least one thing that actually identifies the
   * legal entity — the register number, the VAT id, or the seat.
   */
  const hasIdentity = computed(() => {
    const d = data.value
    if (!d?.name?.trim()) return false
    return Boolean(
      d.registrationNumber?.trim()
      || d.vatId?.trim()
      || d.addressLine1?.trim()
      || d.city?.trim(),
    )
  })

  /** Single-line seat, the form art. 22 §4 asks to be shown. */
  const registeredSeat = computed(() => {
    const d = data.value
    if (!d) return ''
    const street = [d.addressLine1, d.addressLine2]
      .map(part => part?.trim())
      .filter(Boolean)
      .join(', ')
    const locality = [d.postalCode, d.city]
      .map(part => part?.trim())
      .filter(Boolean)
      .join(' ')
    return [street, locality, d.country?.trim()]
      .filter(Boolean)
      .join(', ')
  })

  /** Company name with its legal form, the way it is normally written. */
  const legalName = computed(() => {
    const d = data.value
    if (!d) return ''
    const name = d.name?.trim() ?? ''
    const form = d.legalForm?.trim() ?? ''
    // Merchants routinely type the form INTO the name ("Acme MON IKE").
    // Appending it again would read as a typo on their own company name.
    if (!form || name.toLocaleUpperCase('el').includes(form.toLocaleUpperCase('el'))) {
      return name
    }
    return `${name} ${form}`
  })

  return {
    identity: computed(() => data.value),
    hasIdentity,
    legalName,
    registeredSeat,
    inLiquidation: computed(() => data.value?.inLiquidation ?? false),
    isComplete: computed(() => data.value?.isComplete ?? false),
    missingFields: computed(() => data.value?.missingFields ?? []),
  }
}
