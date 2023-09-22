import { IFetchError } from 'ofetch'
import { Account, AccountPutRequest, UserAccountSession } from '~/types/user/account'
import { Favourite, FavouriteCreateRequest } from '~/types/product/favourite'
import { Review } from '~/types/product/review'
import { Order } from '~/types/order/order'
import { Address } from '~/types/user/address'

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
				} = await useFetch<UserAccountSession>(`/api/user-account-session`, {
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
				this.error.account = error as IFetchError
			}
		},
		async updateAccount(id: number, body: AccountPutRequest) {
			try {
				const {
					data: account,
					error,
					pending
				} = await useFetch<Account>(`/api/user-account/${id}`, {
					method: 'put',
					body
				})
				this.account = account.value
				this.error.account = error.value
				this.pending.account = pending.value
			} catch (error) {
				this.error.account = error as IFetchError
			}
		},
		async updateAccountImage(id: number, body: FormData) {
			try {
				const {
					data: account,
					pending,
					error
				} = await useFetch<Account>(`/api/user-account/${id}`, {
					method: 'patch',
					body
				})
				this.account = account.value
				this.error.account = error.value
				this.pending.account = pending.value
			} catch (error) {
				this.error.account = error as IFetchError
			}
		},
		async addFavourite(body: FavouriteCreateRequest) {
			try {
				const {
					data: favourite,
					error,
					pending
				} = await useFetch<Favourite>(`/api/product-favourites`, {
					method: 'post',
					body
				})
				if (favourite.value) {
					this.favourites?.push(favourite.value)
				}
				this.error.favourites = error.value
				this.pending.favourites = pending.value
			} catch (error) {
				this.error.favourites = error as IFetchError
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
				this.error.favourites = error as IFetchError
			}
		}
	}
})
