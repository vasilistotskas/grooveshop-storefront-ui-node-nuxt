<script lang="ts" setup>
import type { Product, ProductOrderingField, ProductQuery } from '~/types/product/product'
import type { EntityOrdering, OrderingOption } from '~/types/ordering'
import emptyIcon from '~icons/mdi/package-variant-remove'

const route = useRoute()
const { t } = useLang()

const productStore = useProductsStore()
const { products, pending } = storeToRefs(productStore)
const { fetchProducts } = productStore

const routePaginationParams = computed<ProductQuery>(() => {
	const limit = Number(route.query.limit) || undefined
	const offset = Number(route.query.offset) || undefined
	const ordering = route.query.ordering || '-createdAt'

	return {
		limit,
		offset,
		ordering
	}
})

const entityOrdering: EntityOrdering<ProductOrderingField> = reactive([
	{
		value: 'price',
		label: t('pages.product.ordering.price'),
		options: ['ascending', 'descending']
	},
	{
		value: 'createdAt',
		label: t('pages.product.ordering.created_at'),
		options: ['ascending', 'descending']
	}
])

const orderingFields: Partial<Record<ProductOrderingField, OrderingOption[]>> = reactive({
	price: [],
	createdAt: []
})

await fetchProducts(routePaginationParams.value)

const refreshProducts = async () => await fetchProducts(routePaginationParams.value)

const pagination = computed(() => {
	return usePagination<Product>(products.value)
})

const ordering = computed(() => {
	return useOrdering<ProductOrderingField>(entityOrdering, orderingFields)
})

watch(
	() => route.query,
	() => refreshProducts()
)
</script>

<template>
	<div class="products-list grid gap-4">
		<template v-if="!pending.products && products?.results?.length">
			<div class="flex gap-2 flex-row items-center">
				<PaginationLimitOffset
					:page="pagination.page"
					:limit="pagination.limit"
					:offset="pagination.offset"
					:total-pages="pagination.totalPages"
					:page-total-results="pagination.pageTotalResults"
				/>
				<Ordering
					:ordering="String(routePaginationParams.ordering)"
					:ordering-options="ordering.orderingOptionsArray.value"
				/>
			</div>
			<ol
				class="grid items-center justify-center grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
			>
				<template v-for="(product, index) in products.results" :key="index">
					<ProductCard :product="product" :img-loading="index > 7 ? 'lazy' : 'eager'" />
				</template>
			</ol>
		</template>
		<template v-if="!pending.products && !products?.results?.length">
			<EmptyState :icon="emptyIcon">
				<template #actions>
					<MainButton
						:text="$t('common.empty.button')"
						:type="'link'"
						:to="'index'"
					></MainButton>
				</template>
			</EmptyState>
		</template>
	</div>
</template>
