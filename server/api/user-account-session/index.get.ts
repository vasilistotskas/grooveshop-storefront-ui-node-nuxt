import type { H3Event } from 'h3'
import { z } from 'zod'

import { ZodAccount } from '~/types/user/account'
import { buildFullUrl } from '~/utils/api'
import { ZodFavourite } from '~/types/product/favourite'
import { ZodOrder } from '~/types/order/order'
import { ZodReview } from '~/types/product/review'
import { ZodAddress } from '~/types/user/address'
import type { FavouriteQuery } from '~/types/product/favourite'
import type { OrderQuery } from '~/types/order/order'
import type { ReviewQuery } from '~/types/product/review'
import type { AddressQuery } from '~/types/user/address'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()

	// Account
	const accountResponse = await $api(
		`${config.public.apiBaseUrl}/user/account/session/`,
		event
	)
	const accountParsedData = await parseDataAs(accountResponse, ZodAccount)

	// Favourites
	const favouritesQuery: FavouriteQuery = {
		userId: String(accountParsedData.id),
		pagination: 'false'
	}
	const favouritesUrl = buildFullUrl(
		`${config.public.apiBaseUrl}/product/favourite/`,
		favouritesQuery
	)
	const favouritesResponse = await $api(favouritesUrl, event)

	// Reviews
	const reviewsQuery: ReviewQuery = {
		userId: String(accountParsedData.id),
		pagination: 'false'
	}
	const reviewsUrl = buildFullUrl(
		`${config.public.apiBaseUrl}/product/review/`,
		reviewsQuery
	)
	const reviewsResponse = await $api(reviewsUrl, event)

	// Orders
	const ordersQuery: OrderQuery = {
		userId: String(accountParsedData.id),
		pagination: 'false'
	}
	const ordersUrl = buildFullUrl(`${config.public.apiBaseUrl}/order/`, ordersQuery)
	const ordersResponse = await $api(ordersUrl, event)

	// Addresses
	const addressesQuery: AddressQuery = {
		user: String(accountParsedData.id),
		pagination: 'false'
	}

	const addressesUrl = buildFullUrl(
		`${config.public.apiBaseUrl}/user/address/`,
		addressesQuery
	)
	const addressesResponse = await $api(addressesUrl, event)

	// Parse data
	const favouritesParsedData = await parseDataAs(
		favouritesResponse,
		z.array(ZodFavourite)
	)
	const reviewsParsedData = await parseDataAs(reviewsResponse, z.array(ZodReview))
	const ordersParsedData = await parseDataAs(ordersResponse, z.array(ZodOrder))
	const addressesParsedData = await parseDataAs(addressesResponse, z.array(ZodAddress))

	return {
		account: accountParsedData,
		favourites: favouritesParsedData,
		orders: ordersParsedData,
		reviews: reviewsParsedData,
		addresses: addressesParsedData
	}
})
