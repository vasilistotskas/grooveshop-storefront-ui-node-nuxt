import type { H3Event } from 'h3'

import { ZodBlogCategory, ZodBlogCategoryParams } from '~/types/blog/category'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const params = await getValidatedRouterParams(
    event,
    ZodBlogCategoryParams.parse,
  )
  const response = await $fetch(
    `${config.public.apiBaseUrl}/blog/category/${params.id}`,
    {
      method: 'GET',
    },
  )
  return await parseDataAs(response, ZodBlogCategory)
})
