import { z } from 'zod'

import { ZodBlogCommentParams } from '~/types/blog/comment'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodBlogCommentParams.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/blog/comment/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return parseDataAs(response, z.any())
  }
  catch (error) {
    await handleError(error)
  }
})
