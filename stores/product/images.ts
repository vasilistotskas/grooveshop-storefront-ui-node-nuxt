import { FetchError } from 'ofetch'
import { Pagination } from '~/zod/pagination/pagination'
import { Image, ImageQuery } from '~/zod/product/image'

interface ErrorRecord {
	images: FetchError | null
}

interface PendingRecord {
	images: boolean
}

const errorsFactory = (): ErrorRecord => ({
	images: null
})

const pendingFactory = (): PendingRecord => ({
	images: false
})

export interface ImagesState {
	images: Pagination<Image> | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useImagesStore = defineStore({
	id: 'product-images',
	state: (): ImagesState => ({
		images: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	getters: {
		getImageById: (state) => (id: number) => {
			return state.images?.results?.find((image) => image.id === id)
		}
	},
	actions: {
		async fetchImages({ product }: ImageQuery): Promise<void> {
			try {
				const {
					data: images,
					error,
					pending
				} = await useFetch(`/api/product-images`, {
					method: 'get',
					params: {
						product
					}
				})
				this.images = images.value
				this.error.images = error.value
				this.pending.images = pending.value
			} catch (error) {
				this.error.images = error as FetchError
			}
		}
	}
})
