import type { IFetchError } from 'ofetch'
import type { Product, ProductCreateBody, ProductQuery } from '~/types/product/product'
import type { Pagination } from '~/types/pagination'

interface ErrorRecord {
	product: IFetchError | null
	products: IFetchError | null
}

interface PendingRecord {
	product: boolean
	products: boolean
}

const errorsFactory = (): ErrorRecord => ({
	product: null,
	products: null
})

const pendingFactory = (): PendingRecord => ({
	product: false,
	products: false
})

export const useProductStore = defineStore(
	'product',
	() => {
		const product = ref<Product | null>(null)
		const products = ref<Pagination<Product> | null>(null)
		const pending = ref<PendingRecord>(pendingFactory())
		const error = ref<ErrorRecord>(errorsFactory())

		async function fetchProduct(id: string | number) {
			if (process.prerender) {
				return
			}
			const {
				data,
				error: productError,
				pending: productPending,
				refresh
			} = await useFetch<Product>(`/api/products/${id}`, {
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
			} = await useFetch(`/api/products/${id}/update-product-hits`, {
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

		async function fetchProducts({ offset, limit, ordering, category }: ProductQuery) {
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
					ordering,
					category
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
			product,
			products,
			pending,
			error,
			fetchProduct,
			createProduct,
			updateProductHits,
			fetchProducts
		}
	},
	{
		persist: true
	}
)
