import type { H3Event } from 'h3'
import { z } from 'zod'

import { ZodUserAccount } from '~/types/user/account'
import { buildFullUrl } from '~/utils/api'
import { ZodProductFavourite } from '~/types/product/favourite'
import { ZodOrder } from '~/types/order/order'
import { ZodProductReview } from '~/types/product/review'
import { ZodUserAddress } from '~/types/user/address'
import type { ProductFavouriteQuery } from '~/types/product/favourite'
import type { OrderQuery } from '~/types/order/order'
import type { ProductReviewQuery } from '~/types/product/review'
import type { UserAddressQuery } from '~/types/user/address'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()

	// Account
	const accountResponse = await $api(
		`${config.public.apiBaseUrl}/user/account/session`,
		event
	)
	const accountParsedData = await parseDataAs(accountResponse, ZodUserAccount)

	// Favourites
	const favouritesQuery: ProductFavouriteQuery = {
		userId: String(accountParsedData.id),
		pagination: 'false'
	}
	const favouritesUrl = buildFullUrl(
		`${config.public.apiBaseUrl}/product/favourite`,
		favouritesQuery
	)
	const favouritesResponse = await $api(favouritesUrl, event)

	// Reviews
	const reviewsQuery: ProductReviewQuery = {
		userId: String(accountParsedData.id),
		pagination: 'false',
		status: 'TRUE'
	}
	const reviewsUrl = buildFullUrl(
		`${config.public.apiBaseUrl}/product/review`,
		reviewsQuery
	)
	const reviewsResponse = await $api(reviewsUrl, event)

	// Orders
	const ordersQuery: OrderQuery = {
		userId: String(accountParsedData.id),
		pagination: 'false'
	}
	const ordersUrl = buildFullUrl(`${config.public.apiBaseUrl}/order`, ordersQuery)
	const ordersResponse = await $api(ordersUrl, event)

	// Addresses
	const addressesQuery: UserAddressQuery = {
		user: String(accountParsedData.id),
		pagination: 'false'
	}

	const addressesUrl = buildFullUrl(
		`${config.public.apiBaseUrl}/user/address`,
		addressesQuery
	)
	const addressesResponse = await $api(addressesUrl, event)

	// Parse data
	const favouritesParsedData = await parseDataAs(
		favouritesResponse,
		z.array(ZodProductFavourite)
	)
	const reviewsParsedData = await parseDataAs(reviewsResponse, z.array(ZodProductReview))
	const ordersParsedData = await parseDataAs(ordersResponse, z.array(ZodOrder))
	const addressesParsedData = await parseDataAs(
		addressesResponse,
		z.array(ZodUserAddress)
	)

	return {
		account: accountParsedData,
		favourites: favouritesParsedData,
		orders: ordersParsedData,
		reviews: reviewsParsedData,
		addresses: addressesParsedData
	}
})
