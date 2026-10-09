import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(
      event,
      zIncrementProductViewsPath,
    )
    // useBackendFetch relays the visitor's identity: Django throttles
    // view counting per visitor, and a bare $fetch reaches it as this
    // pod, putting every anonymous visitor in one shared bucket.
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/product/${params.id}/update_view_count`,
      {
        method: 'POST',
      },
    )
    return await parseDataAs(response, zIncrementProductViewsResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
