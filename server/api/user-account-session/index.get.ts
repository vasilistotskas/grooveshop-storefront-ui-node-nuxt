import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs } from '~/types/parser'
import { ZodAccount } from '~/types/user/account'
import { buildFullUrl } from '~/utils/api'
import { FavouriteQuery, ZodFavourite } from '~/types/product/favourite'
import { OrderQuery, ZodOrder } from '~/types/order/order'
import { ReviewQuery, ZodReview } from '~/types/product/review'
import { AddressQuery, ZodAddress } from '~/types/user/address'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const cookie = event.node.req.headers.cookie

	// Account
	const accountResponse = await $fetch(
		`${config.public.apiBaseUrl}/user/account/session/`,
		{
			headers: {
				Cookie: cookie || ''
			}
		}
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
	const favouritesResponse = await $fetch(favouritesUrl, {
		headers: {
			Cookie: cookie || ''
		}
	})

	// Reviews
	const reviewsQuery: ReviewQuery = {
		userId: String(accountParsedData.id),
		pagination: 'false'
	}
	const reviewsUrl = buildFullUrl(
		`${config.public.apiBaseUrl}/product/review/`,
		reviewsQuery
	)
	const reviewsResponse = await $fetch(reviewsUrl, {
		headers: {
			Cookie: cookie || ''
		}
	})

	// Orders
	const ordersQuery: OrderQuery = {
		userId: String(accountParsedData.id),
		pagination: 'false'
	}
	const ordersUrl = buildFullUrl(`${config.public.apiBaseUrl}/order/`, ordersQuery)
	const ordersResponse = await $fetch(ordersUrl, {
		headers: {
			Cookie: cookie || ''
		}
	})

	// Addresses
	const addressesQuery: AddressQuery = {
		userId: String(accountParsedData.id),
		pagination: 'false'
	}

	const addressesUrl = buildFullUrl(
		`${config.public.apiBaseUrl}/user/address/`,
		addressesQuery
	)
	const addressesResponse = await $fetch(addressesUrl, {
		headers: {
			Cookie: cookie || ''
		}
	})

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
