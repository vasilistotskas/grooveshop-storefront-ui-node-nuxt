<script lang="ts" setup>
import { Address, AddressOrderingField, AddressQuery } from '~/types/user/address'
import { EntityOrdering, OrderingOption } from '~/types/ordering/ordering'
import emptyIcon from '~icons/mdi/package-variant-remove'

const { t } = useLang()
const route = useRoute('account-addresses___en')

const userStore = useUserStore()
const { account } = storeToRefs(userStore)

const addressStore = useUserAddressStore()
const { addresses, pending, error } = storeToRefs(addressStore)

const entityOrdering: EntityOrdering<AddressOrderingField> = [
	{
		value: 'createdAt',
		label: t('pages.account.addresses.ordering.created_at'),
		options: ['ascending', 'descending']
	},
	{
		value: 'isMain',
		label: t('pages.account.addresses.ordering.is_main'),
		options: ['ascending', 'descending']
	}
]

const orderingFields: Partial<Record<AddressOrderingField, OrderingOption[]>> = {
	createdAt: [],
	isMain: []
}

const pagination = computed(() => {
	return usePagination<Address>(addresses.value)
})

const ordering = computed(() => {
	return useOrdering<AddressOrderingField>(entityOrdering, orderingFields)
})

const routePaginationParams = ref<AddressQuery>({
	page: Number(route.query.page) || undefined,
	ordering: route.query.ordering || '-isMain',
	userId: String(account.value?.id),
	expand: 'true'
})

await addressStore.fetchAddresses(routePaginationParams.value)

const refresh = () => addressStore.fetchAddresses(routePaginationParams.value)

const bus = useEventBus<string>('userAddresses')
bus.on((event, payload: AddressQuery) => {
	switch (event) {
		case 'update':
			routePaginationParams.value = payload
			refresh()
			break
		case 'delete':
			refresh()
			break
	}
})

watch(
	() => route.query,
	() => {
		bus.emit('update', {
			page: Number(route.query.page) || 1,
			ordering: route.query.ordering || '-isMain',
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
			<PageTitle :text="$t('pages.account.addresses.title')" />
		</PageHeader>
		<PageBody>
			<LoadingSkeleton
				v-if="pending.addresses"
				:card-height="'422px'"
				:class="pending.addresses ? 'block' : 'hidden'"
				:loading="pending.addresses"
				:replicas="addresses?.results?.length || 4"
			></LoadingSkeleton>
			<template v-if="!pending.addresses && addresses?.results?.length">
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
				<AddressList :addresses="addresses.results" />
			</template>
			<Error
				v-else-if="error.addresses"
				:code="error.addresses.statusCode"
				:error="error.addresses"
			/>
			<template v-else-if="!addresses?.results?.length">
				<div class="flex gap-4">
					<AddressAddNew />
					<EmptyState :icon="emptyIcon">
						<template #actions>
							<Button
								:text="$t('common.empty.button')"
								:type="'link'"
								:to="'index'"
							></Button>
						</template>
					</EmptyState>
				</div>
			</template>
		</PageBody>
	</PageWrapper>
</template>
