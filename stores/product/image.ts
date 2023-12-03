import type { IFetchError } from 'ofetch'
import type { Pagination } from '~/types/pagination/pagination'
import type { Image, ImageQuery } from '~/types/product/image'

interface ErrorRecord {
	images: IFetchError | null
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

export const useProductImageStore = defineStore('productImage', () => {
	const images = ref<Pagination<Image> | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	const getImageById = (id: number): Image | null => {
		return images.value?.results?.find((image) => image.id === id) ?? null
	}

	async function fetchImages({ product }: ImageQuery) {
		if (process.prerender) {
			return
		}
		const {
			data,
			error: imagesError,
			pending: imagesPending,
			refresh
		} = await useFetch<Pagination<Image>>(`/api/product-images`, {
			method: 'get',
			params: {
				product
			}
		})
		images.value = data.value
		error.value.images = imagesError.value
		pending.value.images = imagesPending.value

		return {
			data,
			error: imagesError,
			pending: imagesPending,
			refresh
		}
	}

	return {
		images,
		pending,
		error,
		getImageById,
		fetchImages
	}
})
