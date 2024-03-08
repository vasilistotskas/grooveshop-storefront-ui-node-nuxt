import type { H3Event } from 'h3'

import { ZodBlogAuthor, ZodBlogAuthorParams } from '~/types/blog/author'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const params = await getValidatedRouterParams(
    event,
    ZodBlogAuthorParams.parse,
  )
  const response = await $fetch(
    `${config.public.apiBaseUrl}/blog/category/${params.id}`,
    {
      method: 'GET',
    },
  )
  return await parseDataAs(response, ZodBlogAuthor)
})
