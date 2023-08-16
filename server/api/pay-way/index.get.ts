import { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination/pagination'
import { buildFullUrl } from '~/utils/api'
import { parseDataAs, parseQueryAs } from '~/types/parser'
import { ZodPayWay, ZodPayWayQuery } from '~/types/pay-way/pay-way'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodPayWayQuery)
	const cookie = event.node.req.headers.cookie
	const url = buildFullUrl(`${config.public.apiBaseUrl}/pay_way/`, query)
	const response = await $fetch(url, {
		headers: {
			Cookie: cookie || ''
		}
	})
	return await parseDataAs(response, ZodPagination(ZodPayWay))
})
