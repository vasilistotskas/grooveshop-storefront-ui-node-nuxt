import type { H3Event } from 'h3'
import { z } from 'zod'

import {
  ZodSearchProductResult,
  ZodSearchQuery,
  ZodSearchResults,
} from '~/types/search'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const query = await getValidatedQuery(event, ZodSearchQuery.parse)
  const productUrl = buildFullUrl(
    `${config.public.apiBaseUrl}/search/product`,
    query,
  )
  const productResponse = await $fetch(productUrl, {
    method: 'GET',
    timeout: 10000,
    retry: 3,
    retryDelay: 1000,
  })

  const productsParsedData = await parseDataAs(
    productResponse,
    z.union([z.undefined(), ZodSearchProductResult]),
  )

  // @TODO: Implement productCategories and blogPosts
  const productCategoriesParsedData = null

  const results = {
    products: productsParsedData || null,
    productCategories: productCategoriesParsedData,
  }

  return await parseDataAs(results, ZodSearchResults)
})
