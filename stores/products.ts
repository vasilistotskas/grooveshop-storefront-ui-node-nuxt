import { FetchError } from 'ofetch'
import { Product, ProductQuery } from '~/types/product/product'
import { Pagination } from '~/types/pagination/pagination'

interface ErrorRecord {
	products: FetchError | null
}

interface PendingRecord {
	products: boolean
}

const errorsFactory = (): ErrorRecord => ({
	products: null
})

const pendingFactory = (): PendingRecord => ({
	products: false
})

interface ProductState {
	products: Pagination<Product> | null
	pending: PendingRecord
	error: ErrorRecord
}

export const useProductsStore = defineStore({
	id: 'products',
	state: (): ProductState => ({
		products: null,
		pending: pendingFactory(),
		error: errorsFactory()
	}),
	actions: {
		async fetchProducts({ offset, limit, ordering }: ProductQuery) {
			try {
				const {
					data: products,
					error,
					pending
				} = await useFetch(`/api/products`, {
					method: 'get',
					params: {
						offset,
						limit,
						ordering
					}
				})
				this.products = products.value
				this.error.products = error.value
				this.pending.products = pending.value
			} catch (error) {
				this.error.products = error as FetchError
			}
		}
	}
})
