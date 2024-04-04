import type { H3Event } from 'h3'

import { ZodBlogPost, ZodBlogPostParams } from '~/types/blog/post'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const params = await getValidatedRouterParams(event, ZodBlogPostParams.parse)
  const response = await $fetch(
    `${config.public.apiBaseUrl}/blog/post/${params.id}/update_view_count`,
    {
      method: 'POST',
    },
  )
  return await parseDataAs(response, ZodBlogPost)
})
