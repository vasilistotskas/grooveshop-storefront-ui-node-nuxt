import type { IFetchError } from 'ofetch'
import type {
	UserAccount,
	UserAccountPutBody,
	UserAccountSession
} from '~/types/user/account'
import type {
	ProductFavourite,
	ProductFavouriteCreateBody
} from '~/types/product/favourite'
import type { ProductReview } from '~/types/product/review'
import type { Order } from '~/types/order/order'
import type { UserAddress } from '~/types/user/address'

interface ErrorRecord {
	account: IFetchError | null
	favourites: IFetchError | null
	reviews: IFetchError | null
	orders: IFetchError | null
	addresses: IFetchError | null
}

interface PendingRecord {
	account: boolean
	favourites: boolean
	reviews: boolean
	orders: boolean
	addresses: boolean
}

const errorsFactory = (): ErrorRecord => ({
	account: null,
	favourites: null,
	reviews: null,
	orders: null,
	addresses: null
})

const pendingFactory = (): PendingRecord => ({
	account: false,
	favourites: false,
	reviews: false,
	orders: false,
	addresses: false
})

export const useUserStore = defineStore('user', () => {
	const account = ref<UserAccount | null>(null)
	const favourites = ref<ProductFavourite[] | null>(null)
	const reviews = ref<ProductReview[] | null>(null)
	const orders = ref<Order[] | null>(null)
	const addresses = ref<UserAddress[] | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const getIsProductInFavourites = (id: number): boolean => {
		return favourites.value?.some((favourite) => favourite.product === id) || false
	}

	const getUserToProductFavourite = (id: number): ProductFavourite | null => {
		return favourites.value?.find((favourite) => favourite.product === id) || null
	}

	async function fetchAccount() {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: accountError,
			pending: accountPending,
			refresh
		} = await useFetch<UserAccountSession>(`/api/user/account/session`, {
			method: 'get'
		})

		if (data.value) {
			account.value = data.value.account
			favourites.value = data.value.favourites
			reviews.value = data.value.reviews
			orders.value = data.value.orders
			addresses.value = data.value.addresses
		}
		error.value.account = accountError.value
		pending.value.account = accountPending.value

		return {
			data,
			error: accountError,
			pending: accountPending,
			refresh
		}
	}

	async function updateAccount(id: number, body: UserAccountPutBody) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: accountError,
			pending: accountPending,
			refresh
		} = await useFetch<UserAccount>(`/api/user/account/${id}`, {
			method: 'put',
			body
		})
		account.value = data.value
		error.value.account = accountError.value
		pending.value.account = accountPending.value

		return {
			data,
			error: accountError,
			pending: accountPending,
			refresh
		}
	}

	async function updateAccountImage(id: number, body: FormData) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: accountError,
			pending: accountPending,
			refresh
		} = await useFetch<UserAccount>(`/api/user/account/${id}`, {
			method: 'patch',
			body
		})
		account.value = data.value
		error.value.account = accountError.value
		pending.value.account = accountPending.value

		return {
			data,
			error: accountError,
			pending: accountPending,
			refresh
		}
	}

	async function addFavourite(body: ProductFavouriteCreateBody) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: favouriteError,
			pending: favouritePending,
			refresh
		} = await useFetch<ProductFavourite>(`/api/products/favourites`, {
			method: 'post',
			body
		})
		if (data.value) {
			favourites.value?.push(data.value)
		}
		error.value.favourites = favouriteError.value
		pending.value.favourites = favouritePending.value

		return {
			data,
			error: favouriteError,
			pending: favouritePending,
			refresh
		}
	}

	async function removeFavourite(id: number) {
		if (process.prerender) {
			return
		}
		const {
			error: favouriteError,
			pending: favouritePending,
			refresh
		} = await useFetch(`/api/products/favourites/${id}`, {
			method: 'delete'
		})
		favourites.value =
			favourites.value?.filter((favourite) => favourite.id !== id) ?? null
		error.value.favourites = favouriteError.value
		pending.value.favourites = favouritePending.value

		return {
			error: favouriteError,
			pending: favouritePending,
			refresh
		}
	}

	function cleanAccountState() {
		account.value = null
		favourites.value = null
		reviews.value = null
		orders.value = null
		addresses.value = null
		pending.value = pendingFactory()
		error.value = errorsFactory()
	}

	return {
		account,
		favourites,
		reviews,
		orders,
		addresses,
		pending,
		error,
		getIsProductInFavourites,
		getUserToProductFavourite,
		fetchAccount,
		updateAccount,
		updateAccountImage,
		addFavourite,
		removeFavourite,
		cleanAccountState
	}
})
