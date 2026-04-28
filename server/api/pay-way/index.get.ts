export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListPayWayQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/pay_way`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListPayWayResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'PayWayViewSet',
  // 5 min — PayWays don't change often, but admins disabling a method
  // (Αντικαταβολή / cash-on-delivery / etc.) need it to disappear from
  // the storefront in a reasonable window. Previous 1-hour TTL meant a
  // disabled method could keep showing for up to an hour after the
  // admin toggle. Shorten the window; pair with SWR so the perf cost
  // is absorbed at the edge.
  maxAge: 60 * 5,
  staleMaxAge: 60 * 30,
  swr: true,
  getKey: event => `pay-way:${JSON.stringify(getQuery(event))}`,
})
