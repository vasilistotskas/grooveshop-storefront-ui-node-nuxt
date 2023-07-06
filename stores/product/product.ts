import { FetchError } from 'ofetch'
import { Product, ProductCreateRequest } from '~/zod/product/product'

interface ErrorRecord {
	product: FetchError | null
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

interface ProductState {
	product: Product | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useProductStore = defineStore({
	id: 'product',
	state: (): ProductState => ({
		product: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	actions: {
		async fetchProduct(id: string | number) {
			const {
				data: product,
				error,
				pending
			} = await useFetch(`/api/product/${id}`, {
				method: 'get'
			})
			this.product = product.value
			this.error.product = error.value
			this.pending.product = pending.value
		},
		async createProduct(body: ProductCreateRequest) {
			try {
				const {
					data: newProduct,
					error,
					pending
				} = await useFetch(`/api/products`, {
					method: 'post',
					body: JSON.stringify(body)
				})
				this.error.product = error.value
				this.pending.product = pending.value
			} catch (error) {
				this.error.product = error as FetchError
			}
		},
		async updateProductHits(id: string | number) {
			try {
				const { error, pending } = await useFetch(
					`/api/product/${id}/update-product-hits`,
					{
						method: 'post'
					}
				)
				this.error.product = error.value
				this.pending.product = pending.value
			} catch (error) {
				this.error.product = error as FetchError
			}
		}
	}
})
