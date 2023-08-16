<script lang="ts" setup>
import { PropType } from 'vue'
import { Review, ReviewOrderingField, ReviewQuery } from '~/types/product/review'
import { EntityOrdering, OrderingOption } from '~/types/ordering/ordering'
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

const { productId, reviewsAverage, reviewsCount, displayImageOf } = toRefs(props)
const { t } = useLang()
const route = useRoute()

const routePaginationParams = ref<ReviewQuery>({
	productId: String(productId.value),
	page: Number(route.query.page) || undefined,
	ordering: route.query.ordering || '-createdAt',
	expand: 'true'
})

const reviewsStore = useReviewsStore()
const { reviews, error, pending } = storeToRefs(reviewsStore)

await reviewsStore.fetchReviews(routePaginationParams.value)

const entityOrdering: EntityOrdering<ReviewOrderingField> = [
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
]

const orderingFields: Partial<Record<ReviewOrderingField, OrderingOption[]>> = {
	id: [],
	userId: [],
	productId: [],
	createdAt: []
}

const pagination = computed(() => {
	return usePagination<Review>(reviews.value)
})

const ordering = computed(() => {
	return useOrdering<ReviewOrderingField>(entityOrdering, orderingFields)
})
</script>

<template>
	<div
		class="container-small reviews-list text-gray-700 dark:text-gray-200 p-6 border-t border-gray-900/10 dark:border-gray-50/[0.2]"
	>
		<Error v-if="error.reviews" :code="error.reviews.statusCode" :error="error.reviews" />
		<template v-else>
			<div class="reviews-list-header">
				<h2 class="reviews-list-title">
					{{ $t('components.product.reviews.title') }}
				</h2>
				<div
					v-if="reviews?.results && reviews?.results?.length > 0"
					class="reviews-list-actions"
				>
					<div class="reviews-list-pagination">
						<PaginationPageNumber
							:results-count="pagination.resultsCount"
							:total-pages="pagination.totalPages"
							:page-total-results="pagination.pageTotalResults"
							:page-size="pagination.pageSize"
							:current-page="pagination.currentPage"
							:links="pagination.links"
						/>
					</div>
					<div class="reviews-list-ordering">
						<Ordering
							:ordering="String(routePaginationParams.ordering)"
							:ordering-options="ordering.orderingOptionsArray.value"
						></Ordering>
					</div>
				</div>
			</div>
			<div class="reviews-list-body">
				<div class="reviews-list-items">
					<LoadingSkeleton
						v-if="pending.reviews && !error.reviews && !reviews?.results?.length"
						:card-height="'130px'"
						:class="
							pending.reviews
								? 'grid grid-rows-repeat-auto-fill-mimax-100-130 gap-4'
								: 'hidden'
						"
						:loading="pending.reviews"
						:direction="'row'"
						:columns-md="1"
						:columns-lg="1"
						:card-body-paragraphs="5"
						:replicas="reviews?.results?.length || 4"
					></LoadingSkeleton>
					<ProductReviewsList
						v-if="!pending.reviews && reviews?.results?.length"
						:reviews-average="reviewsAverage"
						:reviews-count="reviewsCount"
						:reviews="reviews.results"
						:display-image-of="displayImageOf"
					/>
					<template v-if="!pending.reviews && !reviews?.results?.length">
						<EmptyState :icon="emptyIcon">
							<template #actions>
								<Button
									:text="$t('common.empty.button')"
									:type="'link'"
									:to="'index'"
								></Button>
							</template>
						</EmptyState>
					</template>
				</div>
			</div>
			<div class="reviews-list-footer"></div>
		</template>
	</div>
</template>

<style lang="scss" scoped>
.reviews-list {
	width: 100%;
	display: grid;

	&-header {
		display: grid;
		gap: 1rem;
	}

	&-title {
		font-size: 1.5rem;
		font-weight: 600;
	}

	&-actions {
		display: grid;
		justify-items: start;
		gap: 1rem;

		@media screen and (width >= 768px) {
			display: flex;
			align-items: center;
		}
	}

	&-pagination {
		display: grid;
	}

	&-ordering {
		display: grid;
	}

	&-body {
		display: grid;
	}

	&-items {
		display: grid;
		gap: 1rem;
	}

	&-item {
		padding: 1rem;

		&-content {
			display: grid;
			gap: 1rem;

			&-header {
				display: grid;
				gap: 0.5rem;
			}
		}
	}

	&-footer {
		display: flex;
		align-items: center;
		justify-content: center;
	}
}
</style>
