<script lang="ts" setup>
import { PropType } from 'vue'
import { Review, ReviewOrderingField, ReviewQuery } from '~/zod/product/review'
import { EntityOrdering, OrderingOption } from '~/zod/ordering/ordering'
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

const { t } = useLang()
const toast = useToast()
const route = useRoute()

const routePaginationParams = ref<ReviewQuery>({
	productId: String(props.productId),
	page: Number(route.query.page) || undefined,
	ordering: route.query.ordering || '-createdAt',
	expand: 'true'
})

const reviewsStore = useReviewsStore()
const { reviews, error, pending } = storeToRefs(reviewsStore)
try {
	await reviewsStore.fetchReviews(routePaginationParams.value)
} catch (error) {
	//
}

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
		class="container-small reviews_list text-gray-700 dark:text-gray-200 p-6 border-t border-gray-900/10 dark:border-gray-50/[0.2]"
	>
		<Error v-if="error.reviews" :code="error.reviews.statusCode" :error="error.reviews" />
		<template v-else>
			<div class="reviews_list__header">
				<h2 class="reviews_list__title">{{ $t('components.product.reviews.title') }}</h2>
				<div
					v-if="reviews?.results && reviews?.results?.length > 0"
					class="reviews_list__actions"
				>
					<div class="reviews_list__pagination">
						<PaginationPageNumber
							:results-count="pagination.resultsCount"
							:total-pages="pagination.totalPages"
							:page-total-results="pagination.pageTotalResults"
							:page-size="pagination.pageSize"
							:current-page="pagination.currentPage"
							:links="pagination.links"
						/>
					</div>
					<div class="reviews_list__ordering">
						<Ordering
							:ordering="String(routePaginationParams.ordering)"
							:ordering-options="ordering.orderingOptionsArray.value"
						></Ordering>
					</div>
				</div>
			</div>
			<div class="reviews_list__body">
				<div class="reviews_list__items">
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
									:to="'index/'"
								></Button>
							</template>
						</EmptyState>
					</template>
				</div>
			</div>
			<div class="reviews_list__footer"></div>
		</template>
	</div>
</template>

<style lang="scss" scoped>
.reviews_list {
	width: 100%;
	display: grid;
	&__header {
		display: grid;
		gap: 1rem;
	}
	&__title {
		font-size: 1.5rem;
		font-weight: 600;
	}
	&__actions {
		display: grid;
		justify-items: start;
		gap: 1rem;
		@media screen and (min-width: 768px) {
			display: flex;
			align-items: center;
		}
	}
	&__pagination {
		display: grid;
	}
	&__ordering {
		display: grid;
	}
	&__body {
		display: grid;
	}
	&__items {
		display: grid;
		gap: 1rem;
	}
	&__item {
		padding: 1rem;
		&__content {
			display: grid;
			gap: 1rem;
			&__header {
				display: grid;
				gap: 0.5rem;
			}
		}
	}
	&__footer {
		display: flex;
		align-items: center;
		justify-content: center;
	}
}
</style>
