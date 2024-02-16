<script lang="ts" setup>
import type { Ref } from 'vue'
import type { EntityOrdering, OrderingOption } from '~/types/ordering'
import type {
	ProductReview,
	ProductReviewOrderingField,
	ProductReviewQuery
} from '~/types/product/review'
import emptyIcon from '~icons/mdi/package-variant-remove'

const userStore = useUserStore()
const { account } = storeToRefs(userStore)

const productReviewStore = useProductReviewStore()
const { reviews, pending } = storeToRefs(productReviewStore)
const { fetchReviews } = productReviewStore

const { t } = useI18n()
const route = useRoute('account-reviews___en')

const entityOrdering: Ref<EntityOrdering<ProductReviewOrderingField>> = ref([
	{
		value: 'createdAt',
		label: t('pages.account.reviews.ordering.created_at'),
		options: ['ascending', 'descending']
	}
])

const orderingFields: Partial<Record<ProductReviewOrderingField, OrderingOption[]>> =
	reactive({
		createdAt: []
	})

const pagination = computed(() => {
	return usePagination<ProductReview>(reviews.value)
})

const ordering = computed(() => {
	return useOrdering<ProductReviewOrderingField>(entityOrdering.value, orderingFields)
})

const routePaginationParams = computed<ProductReviewQuery>(() => {
	const page = Number(route.query.page) || undefined
	const ordering = route.query.ordering || '-createdAt'
	const userId = String(account.value?.id)
	const expand = 'true'
	const status = 'TRUE'

	return {
		page,
		ordering,
		userId,
		expand,
		status
	}
})

await fetchReviews(routePaginationParams.value)
const refreshReviews = async () => await fetchReviews(routePaginationParams.value)

watch(
	() => route.query,
	() => refreshReviews()
)

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4 md:gap-8">
		<PageHeader>
			<PageTitle :text="$t('pages.account.reviews.title')" />
		</PageHeader>
		<PageBody>
			<template v-if="reviews && !pending.reviews && reviews?.results?.length">
				<div class="flex flex-row items-center gap-2">
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
						<UButton :label="$t('common.empty.button')" :to="'index'" color="white" />
					</template>
				</EmptyState>
			</template>
		</PageBody>
	</PageWrapper>
</template>
