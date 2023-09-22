import { H3Event } from 'h3'
import { ZodCategory } from '~/types/product/category'
import { ZodPagination } from '~/types/pagination/pagination'
import { parseDataAs } from '~/types/parser'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const response = await $api(`${config.public.apiBaseUrl}/category/`, event)
	return await parseDataAs(response, ZodPagination(ZodCategory))
})
