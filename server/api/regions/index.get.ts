import type { H3Event } from 'h3'

import { ZodPagination } from '~/types/pagination'
import { ZodRegion, ZodRegionsQuery } from '~/types/region'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const query = await getValidatedQuery(event, ZodRegionsQuery.parse)
  const url = buildFullUrl(`${config.public.apiBaseUrl}/region`, query)
  const response = await $fetch(url, {
    method: 'GET',
  })
  return await parseDataAs(response, ZodPagination(ZodRegion))
})
