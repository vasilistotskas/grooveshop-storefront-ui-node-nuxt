<script lang="ts" setup>
import emptyIcon from '~icons/mdi/package-variant-remove'
import type { Order, OrderOrderingField, OrderQuery } from '~/types/order/order'
import type { EntityOrdering, OrderingOption } from '~/types/ordering/ordering'

const userStore = useUserStore()
const { account } = storeToRefs(userStore)

const orderStore = useOrderStore()
const { orders, pending } = storeToRefs(orderStore)
const { fetchOrders } = orderStore

const { t } = useLang()
const route = useRoute('account-orders___en')

const entityOrdering: EntityOrdering<OrderOrderingField> = reactive([
	{
		value: 'createdAt',
		label: t('pages.account.orders.ordering.created_at'),
		options: ['ascending', 'descending']
	}
])

const orderingFields: Partial<Record<OrderOrderingField, OrderingOption[]>> = reactive({
	createdAt: []
})

const pagination = computed(() => {
	return usePagination<Order>(orders.value)
})

const ordering = computed(() => {
	return useOrdering<OrderOrderingField>(entityOrdering, orderingFields)
})

const routePaginationParams = computed<OrderQuery>(() => {
	const page = Number(route.query.page) || undefined
	const ordering = route.query.ordering || '-createdAt'
	const userId = String(account.value?.id)

	return {
		page,
		ordering,
		userId
	}
})

await fetchOrders(routePaginationParams.value)
const refreshOrders = async () => await fetchOrders(routePaginationParams.value)

watch(
	() => route.query,
	() => refreshOrders()
)

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<PageHeader class="mb-4">
			<PageTitle :text="$t('pages.account.orders.title')" />
		</PageHeader>
		<PageBody>
			<template v-if="orders && !pending.orders && orders?.results?.length">
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
				<OrderList :orders="orders.results" />
			</template>
			<template v-if="!pending.orders && !orders?.results?.length">
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
