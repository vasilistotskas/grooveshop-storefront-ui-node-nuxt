<script lang="ts" setup>
import { EntityOrdering, OrderingOption } from '~/types/ordering/ordering'
import { Review, ReviewOrderingField, ReviewQuery } from '~/types/product/review'
import emptyIcon from '~icons/mdi/package-variant-remove'

const { t } = useLang()
const route = useRoute('account-reviews___en')

const userStore = useUserStore()
const { account } = storeToRefs(userStore)

const reviewsStore = useReviewsStore()

const { reviews, pending, error } = storeToRefs(reviewsStore)

const entityOrdering: EntityOrdering<ReviewOrderingField> = reactive([
	{
		value: 'createdAt',
		label: t('pages.account.reviews.ordering.created_at'),
		options: ['ascending', 'descending']
	}
])

const orderingFields: Partial<Record<ReviewOrderingField, OrderingOption[]>> = reactive({
	createdAt: []
})

const pagination = computed(() => {
	return usePagination<Review>(reviews.value)
})

const ordering = computed(() => {
	return useOrdering<ReviewOrderingField>(entityOrdering, orderingFields)
})

const routePaginationParams = computed<ReviewQuery>(() => {
	const page = Number(route.query.page) || undefined
	const ordering = route.query.ordering || '-createdAt'
	const userId = String(account.value?.id)
	const expand = 'true'

	return {
		page,
		ordering,
		userId,
		expand
	}
})

await reviewsStore.fetchReviews(routePaginationParams.value)
const refreshReviews = async () =>
	await reviewsStore.fetchReviews(routePaginationParams.value)

watch(
	() => route.query,
	() => refreshReviews()
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
				:code="error.reviews?.statusCode"
				:error="error.reviews"
			/>
			<template v-if="reviews && !pending.reviews && reviews?.results?.length">
				<div class="grid gap-2 md:flex md:items-center">
					<PaginationPageNumber
						:count="pagination.count"
						:total-pages="pagination.totalPages"
						:page-total-results="pagination.pageTotalResults"
						:page-size="pagination.pageSize"
						:page="pagination.page"
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
						<MainButton
							:text="$t('common.empty.button')"
							:type="'link'"
							:to="'index'"
						></MainButton>
					</template>
				</EmptyState>
			</template>
		</PageBody>
	</PageWrapper>
</template>
