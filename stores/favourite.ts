import type { IFetchError } from 'ofetch'
import type { ProductFavourite, ProductFavouriteQuery } from '~/types/product/favourite'
import type { Pagination } from '~/types/pagination'

interface ErrorRecord {
	favourites: IFetchError | null
}

interface PendingRecord {
	favourites: boolean
}

const errorsFactory = (): ErrorRecord => ({
	favourites: null
})

const pendingFactory = (): PendingRecord => ({
	favourites: false
})

export const useFavouriteStore = defineStore(
	'favourite',
	() => {
		const favourites = ref<Pagination<ProductFavourite> | null>(null)
		const pending = ref<PendingRecord>(pendingFactory())
		const error = ref<ErrorRecord>(errorsFactory())

		async function fetchFavourites({
			page,
			ordering,
			userId,
			expand
		}: ProductFavouriteQuery) {
			if (process.prerender) {
				return
			}
			const {
				data,
				error: favouriteError,
				pending: favouritePending,
				refresh
			} = await useFetch<Pagination<ProductFavourite>>(`/api/products/favourites`, {
				method: 'get',
				params: {
					page,
					ordering,
					userId,
					expand
				}
			})
			favourites.value = data.value
			error.value.favourites = favouriteError.value
			pending.value.favourites = favouritePending.value

			return {
				data,
				error: favouriteError,
				pending: favouritePending,
				refresh
			}
		}

		return {
			favourites,
			pending,
			error,
			fetchFavourites
		}
	},
	{
		persist: true
	}
)
