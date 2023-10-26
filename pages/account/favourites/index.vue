<script lang="ts" setup>
import type {
	Favourite,
	FavouriteOrderingField,
	FavouriteQuery
} from '~/types/product/favourite'
import type { EntityOrdering, OrderingOption } from '~/types/ordering/ordering'
import emptyIcon from '~icons/mdi/package-variant-remove'

const userStore = useUserStore()
const { account } = storeToRefs(userStore)

const favouriteStore = useFavouriteStore()
const { favourites, pending } = storeToRefs(favouriteStore)
const { fetchFavourites } = favouriteStore

const { t } = useLang()
const route = useRoute('account-favourites___en')

const entityOrdering: EntityOrdering<FavouriteOrderingField> = reactive([
	{
		value: 'createdAt',
		label: t('pages.account.favourites.ordering.created_at'),
		options: ['ascending', 'descending']
	}
])

const orderingFields: Partial<Record<FavouriteOrderingField, OrderingOption[]>> =
	reactive({
		createdAt: []
	})

const pagination = computed(() => {
	return usePagination<Favourite>(favourites.value)
})

const ordering = computed(() => {
	return useOrdering<FavouriteOrderingField>(entityOrdering, orderingFields)
})

const routePaginationParams = computed<FavouriteQuery>(() => {
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
	<PageWrapper class="container flex flex-col gap-4">
		<PageHeader class="mb-4">
			<PageTitle :text="$t('pages.account.favourites.title')" />
		</PageHeader>
		<PageBody>
			<template v-if="!pending.favourites && favourites?.results?.length">
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
			</template>
			<template v-if="!pending.favourites && favourites?.results?.length">
				<FavouriteList :favourites="favourites.results" />
			</template>
			<template v-else>
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
