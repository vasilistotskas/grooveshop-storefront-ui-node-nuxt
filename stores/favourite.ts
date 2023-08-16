import { FetchError } from 'ofetch'
import { Favourite, FavouriteQuery } from '~/types/product/favourite'
import { Pagination } from '~/types/pagination/pagination'

interface ErrorRecord {
	favourites: FetchError | null
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

export interface FavouriteState {
	favourites: Pagination<Favourite> | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useFavouriteStore = defineStore({
	id: 'favourite',
	state: (): FavouriteState => ({
		favourites: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	actions: {
		async fetchFavourites({
			page,
			ordering,
			userId,
			expand
		}: FavouriteQuery): Promise<void> {
			try {
				const {
					data: favourites,
					error,
					pending
				} = await useFetch(`/api/product-favourites`, {
					method: 'get',
					params: {
						page,
						ordering,
						userId,
						expand
					}
				})
				this.favourites = favourites.value
				this.error.favourites = error.value
				this.pending.favourites = pending.value
			} catch (error) {
				this.error.favourites = error as FetchError
			}
		}
	}
})
