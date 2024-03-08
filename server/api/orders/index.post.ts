import type { H3Event } from 'h3'

import { ZodOrderCreateBody, ZodOrderCreateResponse } from '~/types/order/order'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const body = await readValidatedBody(event, ZodOrderCreateBody.parse)
  const response = await $fetch(`${config.public.apiBaseUrl}/order`, {
    method: 'POST',
    body,
  })
  return await parseDataAs(response, ZodOrderCreateResponse)
})
