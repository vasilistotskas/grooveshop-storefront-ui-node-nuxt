import { FetchError } from 'ofetch'
import { Account, AccountPutRequest, ZodAccount } from '~/types/user/account'
import { Favourite, FavouriteCreateRequest } from '~/types/product/favourite'
import { Review } from '~/types/product/review'
import { Order } from '~/types/order/order'
import { parseDataAs } from '~/types/parser'
import { Address } from '~/types/user/address'

interface ErrorRecord {
	account: FetchError | null
	favourites: FetchError | null
	reviews: FetchError | null
	orders: FetchError | null
	addresses: FetchError | null
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

export interface UserState {
	account: Account | null
	favourites: Favourite[] | null
	reviews: Review[] | null
	orders: Order[] | null
	addresses: Address[] | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useUserStore = defineStore({
	id: 'user',
	state: (): UserState => ({
		account: null,
		favourites: null,
		reviews: null,
		orders: null,
		addresses: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	getters: {
		getIsProductInFavourites:
			(state) =>
			(id: number): boolean => {
				return state.favourites?.some((favourite) => favourite.product === id) || false
			},
		getUserToProductFavourite:
			(state) =>
			(id: number): Favourite | null => {
				return state.favourites?.find((favourite) => favourite.product === id) || null
			}
	},
	actions: {
		async fetchAccount() {
			try {
				const {
					data: account,
					error,
					pending
				} = await useFetch(`/api/user-account-session`, {
					method: 'get'
				})
				if (account.value) {
					this.account = account.value.account
					this.favourites = account.value.favourites
					this.reviews = account.value.reviews
					this.orders = account.value.orders
					this.addresses = account.value.addresses
				}
				this.error.account = error.value
				this.pending.account = pending.value
			} catch (error) {
				this.error.account = error as FetchError
			}
		},
		async updateAccount(id: number, body: AccountPutRequest) {
			try {
				const {
					data: account,
					error,
					pending
				} = await useFetch(`/api/user-account/${id}`, {
					method: 'put',
					body
				})
				this.account = account.value
				this.error.account = error.value
				this.pending.account = pending.value
			} catch (error) {
				this.error.account = error as FetchError
			}
		},
		async updateAccountImage(id: number, body: FormData) {
			try {
				const config = useRuntimeConfig()
				const csrfToken = useCookie('csrftoken')
				const sessionID = useCookie('sessionid')
				const { data, pending, error } = await useFetch(
					`${config.public.apiBaseUrl}/user/account/${id}/`,
					{
						headers: {
							Cookie: `csrftoken=${csrfToken.value}; sessionid=${sessionID.value}`,
							'X-CSRFToken': csrfToken.value || ''
						},
						method: 'PATCH',
						body
					}
				)
				this.account = await parseDataAs(data.value, ZodAccount).catch((error) => {
					this.error = error?.data
					return null
				})
				this.error.account = error.value
				this.pending.account = pending.value
			} catch (error) {
				this.error.account = error as FetchError
			}
		},
		async addFavourite(body: FavouriteCreateRequest) {
			try {
				const {
					data: favourite,
					error,
					pending
				} = await useFetch(`/api/product-favourites`, {
					method: 'post',
					body
				})
				if (favourite.value) {
					this.favourites?.push(favourite.value)
				}
				this.error.favourites = error.value
				this.pending.favourites = pending.value
			} catch (error) {
				this.error.favourites = error as FetchError
			}
		},
		async removeFavourite(id: number) {
			try {
				const { error, pending } = await useFetch(`/api/product-favourites/${id}`, {
					method: 'delete'
				})
				this.favourites =
					this.favourites?.filter((favourite) => favourite.id !== id) || null
				this.error.favourites = error.value
				this.pending.favourites = pending.value
			} catch (error) {
				this.error.favourites = error as FetchError
			}
		}
	}
})
