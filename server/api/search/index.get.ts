import { z } from 'zod'
import { H3Event } from 'h3'
import { parseDataAs, parseQueryAs } from '~/types/parser'
import { buildFullUrl } from '~/utils/api'
import { ZodSearchProductResult, ZodSearchQuery, ZodSearchResults } from '~/types/search'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodSearchQuery)

	const productUrl = buildFullUrl(`${config.public.apiBaseUrl}/search/product/`, query)
	const productResponse = await $api(productUrl, event, {
		timeout: 10000,
		retry: 3,
		retryDelay: 1000
	})

	const productsParsedData = await parseDataAs(
		productResponse,
		z.union([z.undefined(), ZodSearchProductResult])
	)

	// @TODO: Implement productCategories and blogPosts
	const productCategoriesParsedData = null

	const results = {
		products: productsParsedData || null,
		productCategories: productCategoriesParsedData
	}

	return await parseDataAs(results, ZodSearchResults)
})
