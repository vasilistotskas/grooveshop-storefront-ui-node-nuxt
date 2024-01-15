<script lang="ts" setup>
import type { Ref } from 'vue'
import type { Address, AddressOrderingField, AddressQuery } from '~/types/user/address'
import type { EntityOrdering, OrderingOption } from '~/types/ordering'
import emptyIcon from '~icons/mdi/package-variant-remove'

const userStore = useUserStore()
const { account } = storeToRefs(userStore)

const userAddressStore = useUserAddressStore()
const { addresses, pending } = storeToRefs(userAddressStore)
const { fetchAddresses } = userAddressStore

const { t } = useI18n()
const route = useRoute('account-addresses___en')

const entityOrdering: Ref<EntityOrdering<AddressOrderingField>> = ref([
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
])

const orderingFields: Partial<Record<AddressOrderingField, OrderingOption[]>> = reactive({
	createdAt: [],
	isMain: []
})

const pagination = computed(() => {
	return usePagination<Address>(addresses.value)
})

const ordering = computed(() => {
	return useOrdering<AddressOrderingField>(entityOrdering.value, orderingFields)
})

const routePaginationParams = computed<AddressQuery>(() => {
	const page = Number(route.query.page) || 1
	const ordering = route.query.ordering || '-isMain'
	const user = String(account.value?.id)
	const expand = 'true'

	return {
		page,
		ordering,
		user,
		expand
	}
})

await fetchAddresses(routePaginationParams.value)

const refreshAddresses = async () => await fetchAddresses(routePaginationParams.value)

watch(
	() => route.query,
	() => refreshAddresses()
)

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<PageHeader class="mb-4">
			<PageTitle :text="$t('pages.account.addresses.title')" />
		</PageHeader>
		<UserAccountNavbar />
		<PageBody>
			<template v-if="!pending.addresses && addresses?.results?.length">
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
				<AddressList :addresses="addresses.results" />
			</template>
			<template v-else-if="!addresses?.results?.length">
				<div class="flex gap-4">
					<AddressAddNew />
					<EmptyState :icon="emptyIcon">
						<template #actions>
							<UButton :label="$t('common.empty.button')" :to="'index'" />
						</template>
					</EmptyState>
				</div>
			</template>
		</PageBody>
	</PageWrapper>
</template>
