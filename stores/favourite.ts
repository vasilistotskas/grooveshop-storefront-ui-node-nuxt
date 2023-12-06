import type { IFetchError } from 'ofetch'
import type { Favourite, FavouriteQuery } from '~/types/product/favourite'
import type { Pagination } from '~/types/pagination/pagination'

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
		const favourites = ref<Pagination<Favourite> | null>(null)
		const pending = ref<PendingRecord>(pendingFactory())
		const error = ref<ErrorRecord>(errorsFactory())

		async function fetchFavourites({ page, ordering, userId, expand }: FavouriteQuery) {
			if (process.prerender) {
				return
			}
			const {
				data,
				error: favouriteError,
				pending: favouritePending,
				refresh
			} = await useFetch<Pagination<Favourite>>(`/api/product-favourites`, {
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
