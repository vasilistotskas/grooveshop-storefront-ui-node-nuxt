/**
 * Clones a past order's items back into the authenticated user's active
 * cart. The backend enforces ownership (and only accepts authenticated
 * requests — guest orders cannot be reordered). The response reports which
 * items were re-added and which were skipped because the product went
 * inactive or dropped below the requested quantity.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zReorderOrderPath.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/order/${params.id}/reorder`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zReorderOrderResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
