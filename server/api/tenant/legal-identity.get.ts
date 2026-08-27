/**
 * The seller identity the storefront is legally required to publish.
 *
 * e-Commerce Directive 2000/31/EC art. 5(1) requires the name, the
 * geographic address of establishment, contact details, the trade
 * register and registration number, and the VAT number to be "easily,
 * directly and permanently accessible". N. 4919/2022 art. 22 §3-4 adds
 * the GEMI number and requires the legal form, name, registered seat and
 * liquidation status "σε εμφανές σημείο".
 *
 * Not part of `/api/v1/tenant/resolve`: that endpoint answers from the
 * PUBLIC schema, while this data lives in the tenant schema's
 * extra_settings — see the Django view for the full reasoning.
 */
export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()

  try {
    // useBackendFetch: the identity is per-tenant extra_settings, so the
    // fetch must carry X-Forwarded-Host or Django resolves the public
    // schema and every store gets the same (empty) answer.
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/tenant/legal-identity`,
      { method: 'GET' },
    )
    return await parseDataAs(
      response,
      zApiV1TenantLegalIdentityRetrieveResponse,
    )
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'tenantLegalIdentity',
  // Changes only when a merchant edits a setting, but it renders on
  // every page, so it is cached hard and revalidated in the background.
  maxAge: 60 * 30,
  staleMaxAge: 60 * 60 * 4,
  swr: true,
  getKey: event => tenantCacheKey(event, 'tenant:legal-identity'),
})
