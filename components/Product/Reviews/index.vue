<script lang="ts" setup>
import type { PropType, Ref } from 'vue'
import type { Review, ReviewOrderingField, ReviewQuery } from '~/types/product/review'
import type { EntityOrdering, OrderingOption } from '~/types/ordering'
import emptyIcon from '~icons/mdi/package-variant-remove'

const props = defineProps({
	productId: {
		type: String,
		required: true
	},
	reviewsAverage: {
		type: Number,
		required: false,
		default: 0
	},
	reviewsCount: {
		type: Number,
		required: false,
		default: 0
	},
	displayImageOf: {
		type: String as PropType<'user' | 'product'>,
		required: true,
		validator: (value: string) => ['user', 'product'].includes(value)
	}
})

const productReviewStore = useProductReviewStore()
const { reviews, pending } = storeToRefs(productReviewStore)
const { fetchReviews } = productReviewStore

const { t } = useI18n()
const route = useRoute()

const { productId, reviewsAverage, reviewsCount, displayImageOf } = toRefs(props)

const routePaginationParams = computed<ReviewQuery>(() => {
	const id = String(productId.value)
	const page = Number(route.query.page) || undefined
	const ordering = route.query.ordering || '-createdAt'
	const expand = 'true'

	return {
		productId: id,
		page,
		ordering,
		expand
	}
})

await fetchReviews(routePaginationParams.value)
const refreshReviews = async () => {
	await fetchReviews(routePaginationParams.value)
}

const entityOrdering: Ref<EntityOrdering<ReviewOrderingField>> = ref([
	{
		value: 'id',
		label: t('components.product.reviews.ordering.id'),
		options: ['ascending', 'descending']
	},
	{
		value: 'createdAt',
		label: t('components.product.reviews.ordering.created_at'),
		options: ['ascending', 'descending']
	}
])

const orderingFields: Partial<Record<ReviewOrderingField, OrderingOption[]>> = reactive({
	id: [],
	userId: [],
	productId: [],
	createdAt: []
})

const pagination = computed(() => {
	return usePagination<Review>(reviews.value)
})

const ordering = computed(() => {
	return useOrdering<ReviewOrderingField>(entityOrdering.value, orderingFields)
})

watch(
	() => route.query,
	() => refreshReviews(),
	{ deep: true }
)
</script>

<template>
	<div
		class="container-sm text-primary-700 dark:text-primary-100 p-6 border-t border-gray-900/10 dark:border-gray-50/20"
	>
		<template v-if="!pending.reviews && reviews?.results && reviews?.results?.length > 0">
			<div class="grid gap-4">
				<h2 class="text-2xl font-semibold">
					{{ $t('components.product.reviews.title') }}
				</h2>
				<div class="grid gap-4 md:flex md:items-center justify-start">
					<div class="grid">
						<PaginationPageNumber
							:count="pagination.count"
							:total-pages="pagination.totalPages"
							:page-total-results="pagination.pageTotalResults"
							:page-size="pagination.pageSize"
							:page="pagination.page"
							:links="pagination.links"
						/>
					</div>
					<div class="grid">
						<Ordering
							:ordering="String(routePaginationParams.ordering)"
							:ordering-options="ordering.orderingOptionsArray.value"
						></Ordering>
					</div>
				</div>
			</div>
			<div class="grid">
				<div class="grid gap-4">
					<ProductReviewsList
						:reviews-average="reviewsAverage"
						:reviews-count="reviewsCount"
						:reviews="reviews.results"
						:display-image-of="displayImageOf"
					/>
					<template v-if="!pending.reviews && !reviews?.results?.length">
						<EmptyState :icon="emptyIcon">
							<template #actions>
								<UButton :label="$t('common.empty.button')" :to="'index'" />
							</template>
						</EmptyState>
					</template>
				</div>
			</div>
			<div class="flex items-center justify-center"></div>
		</template>
	</div>
</template>
