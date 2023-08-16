<script lang="ts" setup>
import { Product, ProductOrderingField, ProductQuery } from '~/types/product/product'
import { EntityOrdering, OrderingOption } from '~/types/ordering/ordering'
import emptyIcon from '~icons/mdi/package-variant-remove'

const route = useRoute()
const { t } = useLang()
const store = useProductsStore()

const routePaginationParams = ref<ProductQuery>({
	limit: Number(route.query.limit) || undefined,
	offset: Number(route.query.offset) || undefined,
	ordering: route.query.ordering || '-createdAt'
})

const entityOrdering: EntityOrdering<ProductOrderingField> = [
	{
		value: 'name',
		label: t('pages.product.ordering.name'),
		options: ['ascending', 'descending']
	},
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
]

const orderingFields: Partial<Record<ProductOrderingField, OrderingOption[]>> = {
	name: [],
	price: [],
	createdAt: []
}

await store.fetchProducts(routePaginationParams.value)

const refresh = async () => await store.fetchProducts(routePaginationParams.value)

const { products, pending, error } = storeToRefs(store)

const pagination = computed(() => {
	return usePagination<Product>(products.value)
})

const ordering = computed(() => {
	return useOrdering<ProductOrderingField>(entityOrdering, orderingFields)
})

const bus = useEventBus<string>('products')
bus.on((event, payload: ProductQuery) => {
	routePaginationParams.value = payload
	refresh()
})

watch(
	() => route.query,
	() => {
		bus.emit('update', {
			limit: Number(route.query.limit) || undefined,
			offset: Number(route.query.offset) || undefined,
			ordering: route.query.ordering || '-createdAt'
		})
	}
)
</script>

<template>
	<div class="products-list grid gap-4">
		<Error
			v-if="error.products"
			:code="error.products?.statusCode"
			:error="error.products"
		/>
		<LoadingSkeleton
			v-else-if="pending.products && !products?.results?.length"
			:card-height="'512px'"
			:class="pending.products ? 'block' : 'hidden'"
			:loading="pending.products"
			:replicas="products?.results?.length || 4"
		></LoadingSkeleton>
		<template v-if="!pending.products && products?.results?.length">
			<div class="grid gap-2 md:flex md:items-center">
				<PaginationLimitOffset
					:current-page="pagination.currentPage"
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
				class="grid items-center justify-center grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
			>
				<template v-for="(product, index) in products.results" :key="index">
					<ProductCard :product="product" />
				</template>
			</ol>
		</template>
		<template v-if="!pending.products && !products?.results?.length">
			<EmptyState :icon="emptyIcon">
				<template #actions>
					<Button :text="$t('common.empty.button')" :type="'link'" :to="'index'"></Button>
				</template>
			</EmptyState>
		</template>
	</div>
</template>
