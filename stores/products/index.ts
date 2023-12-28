import type { IFetchError } from 'ofetch'
import type { Product, ProductQuery } from '~/types/product/product'
import type { Pagination } from '~/types/pagination'

interface ErrorRecord {
	products: IFetchError | null
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

export const useProductsStore = defineStore(
	'products',
	() => {
		const products = ref<Pagination<Product> | null>(null)
		const pending = ref<PendingRecord>(pendingFactory())
		const error = ref<ErrorRecord>(errorsFactory())

		async function fetchProducts({ offset, limit, ordering }: ProductQuery) {
			if (process.prerender) {
				return
			}
			const {
				data,
				error: productError,
				pending: productPending,
				refresh
			} = await useFetch<Pagination<Product>>(`/api/products`, {
				method: 'get',
				params: {
					offset,
					limit,
					ordering
				}
			})
			products.value = data.value
			error.value.products = productError.value
			pending.value.products = productPending.value

			return {
				data,
				error: productError,
				pending: productPending,
				refresh
			}
		}

		return {
			products,
			pending,
			error,
			fetchProducts
		}
	},
	{
		persist: true
	}
)
