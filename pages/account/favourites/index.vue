<script lang="ts" setup>
import type { Ref } from 'vue'
import type {
	ProductFavourite,
	ProductFavouriteOrderingField,
	ProductFavouriteQuery
} from '~/types/product/favourite'
import type { EntityOrdering, OrderingOption } from '~/types/ordering'
import emptyIcon from '~icons/mdi/package-variant-remove'

const userStore = useUserStore()
const { account } = storeToRefs(userStore)

const favouriteStore = useFavouriteStore()
const { favourites, pending } = storeToRefs(favouriteStore)
const { fetchFavourites } = favouriteStore

const { t } = useI18n()
const route = useRoute('account-favourites___en')

const entityOrdering: Ref<EntityOrdering<ProductFavouriteOrderingField>> = ref([
	{
		value: 'createdAt',
		label: t('pages.account.favourites.ordering.created_at'),
		options: ['ascending', 'descending']
	}
])

const orderingFields: Partial<Record<ProductFavouriteOrderingField, OrderingOption[]>> =
	reactive({
		createdAt: []
	})

const pagination = computed(() => {
	return usePagination<ProductFavourite>(favourites.value)
})

const ordering = computed(() => {
	return useOrdering<ProductFavouriteOrderingField>(entityOrdering.value, orderingFields)
})

const routePaginationParams = computed<ProductFavouriteQuery>(() => {
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

await fetchFavourites(routePaginationParams.value)
const refreshFavourites = async () => {
	await fetchFavourites(routePaginationParams.value)
}

watch(
	() => route.query,
	() => refreshFavourites()
)

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4 md:gap-8">
		<PageHeader>
			<PageTitle :text="$t('pages.account.favourites.title')" />
		</PageHeader>
		<PageBody>
			<template v-if="!pending.favourites && favourites?.results?.length">
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
			</template>
			<template v-if="!pending.favourites && favourites?.results?.length">
				<FavouriteList :favourites="favourites.results" />
			</template>
			<template v-else>
				<EmptyState :icon="emptyIcon">
					<template #actions>
						<UButton :label="$t('common.empty.button')" :to="'index'" color="white" />
					</template>
				</EmptyState>
			</template>
		</PageBody>
	</PageWrapper>
</template>
