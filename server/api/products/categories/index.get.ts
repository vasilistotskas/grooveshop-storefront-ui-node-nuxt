import type { H3Event } from 'h3'
import { ZodProductCategory } from '~/types/product/category'
import { ZodPagination } from '~/types/pagination'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const response = await $api(`${config.public.apiBaseUrl}/product/category`, event)
	return await parseDataAs(response, ZodPagination(ZodProductCategory))
})
