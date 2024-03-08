import { ZodPagination } from '~/types/pagination'
import { ZodProductCategory } from '~/types/product/category'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const response = await $fetch(
    `${config.public.apiBaseUrl}/product/category`,
    {
      method: 'GET',
    },
  )
  return await parseDataAs(response, ZodPagination(ZodProductCategory))
})
