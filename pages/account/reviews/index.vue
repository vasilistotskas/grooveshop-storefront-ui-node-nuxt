<script lang="ts" setup>
import { EntityOrdering, OrderingOption } from '~/types/ordering/ordering'
import { Review, ReviewOrderingField, ReviewQuery } from '~/types/product/review'
import emptyIcon from '~icons/mdi/package-variant-remove'
import { GlobalEvents } from '~/events/global'

const { t } = useLang()
const route = useRoute('account-reviews___en')

const userStore = useUserStore()
const { account } = storeToRefs(userStore)

const reviewsStore = useReviewsStore()

const { reviews, pending, error } = storeToRefs(reviewsStore)

const entityOrdering: EntityOrdering<ReviewOrderingField> = [
	{
		value: 'createdAt',
		label: t('pages.account.reviews.ordering.created_at'),
		options: ['ascending', 'descending']
	}
]

const orderingFields: Partial<Record<ReviewOrderingField, OrderingOption[]>> = {
	createdAt: []
}

const pagination = computed(() => {
	return usePagination<Review>(reviews.value)
})

const ordering = computed(() => {
	return useOrdering<ReviewOrderingField>(entityOrdering, orderingFields)
})

const routePaginationParams = ref<ReviewQuery>({
	page: Number(route.query.page) || undefined,
	ordering: route.query.ordering || '-createdAt',
	userId: String(account.value?.id),
	expand: 'true'
})

await reviewsStore.fetchReviews(routePaginationParams.value)
const refresh = () => reviewsStore.fetchReviews(routePaginationParams.value)

const bus = useEventBus<string>(GlobalEvents.USER_ACCOUNT_REVIEW)
bus.on((event, payload: ReviewQuery) => {
	routePaginationParams.value = payload
	refresh()
})

watch(
	() => route.query,
	() => {
		bus.emit('update', {
			page: Number(route.query.page) || undefined,
			ordering: route.query.ordering || '-createdAt',
			userId: String(account.value?.id),
			expand: 'true'
		})
	}
)

definePageMeta({
	layout: 'user'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<PageHeader class="mb-4">
			<PageTitle :text="$t('pages.account.reviews.title')" />
		</PageHeader>
		<PageBody>
			<Error
				v-if="error.reviews"
				:code="error.reviews.statusCode"
				:error="error.reviews"
			/>
			<LoadingSkeleton
				v-else-if="pending.reviews && !reviews?.results?.length"
				:card-height="'195px'"
				:class="pending.reviews ? 'block' : 'hidden'"
				:loading="pending.reviews"
				:direction="'row'"
				:columns-md="1"
				:columns-lg="1"
				:card-body-paragraphs="2"
				:replicas="reviews?.results?.length || 4"
			></LoadingSkeleton>
			<template v-if="reviews && !pending.reviews && reviews?.results?.length">
				<div class="grid gap-2 md:flex md:items-center">
					<PaginationPageNumber
						:results-count="pagination.resultsCount"
						:total-pages="pagination.totalPages"
						:page-total-results="pagination.pageTotalResults"
						:page-size="pagination.pageSize"
						:current-page="pagination.currentPage"
						:links="pagination.links"
					/>
					<Ordering
						:ordering="String(routePaginationParams.ordering)"
						:ordering-options="ordering.orderingOptionsArray.value"
					/>
				</div>
				<ProductReviewsList
					:reviews="reviews.results"
					:reviews-count="reviews.count"
					display-image-of="product"
				/>
			</template>
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
		</PageBody>
	</PageWrapper>
</template>
