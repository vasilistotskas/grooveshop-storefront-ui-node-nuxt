import type { IFetchError } from 'ofetch'
import type { Product, ProductCreateBody } from '~/types/product/product'

interface ErrorRecord {
	product: IFetchError | null
}

interface PendingRecord {
	product: boolean
}

const errorsFactory = (): ErrorRecord => ({
	product: null
})

const pendingFactory = (): PendingRecord => ({
	product: false
})

export const useProductStore = defineStore('product', () => {
	const product = ref<Product | null>(null)
	const pending = ref<PendingRecord>(pendingFactory())
	const error = ref<ErrorRecord>(errorsFactory())

	async function fetchProduct(id: string | number) {
		const {
			data,
			error: productError,
			pending: productPending,
			refresh
		} = await useFetch<Product>(`/api/product/${id}`, {
			method: 'get'
		})
		product.value = data.value
		error.value.product = productError.value
		pending.value.product = productPending.value

		return {
			data,
			error: productError,
			pending: productPending,
			refresh
		}
	}

	async function createProduct(body: ProductCreateBody) {
		const {
			data,
			error: productError,
			pending: productPending,
			refresh
		} = await useFetch<Product>(`/api/products`, {
			method: 'post',
			body
		})
		product.value = data.value
		error.value.product = productError.value
		pending.value.product = productPending.value

		return {
			data,
			error: productError,
			pending: productPending,
			refresh
		}
	}

	async function updateProductHits(id: string | number) {
		const {
			error: productError,
			pending: productPending,
			refresh
		} = await useFetch(`/api/product/${id}/update-product-hits`, {
			method: 'post'
		})
		error.value.product = productError.value
		pending.value.product = productPending.value

		return {
			error: productError,
			pending: productPending,
			refresh
		}
	}

	return {
		product,
		pending,
		error,
		fetchProduct,
		createProduct,
		updateProductHits
	}
})
