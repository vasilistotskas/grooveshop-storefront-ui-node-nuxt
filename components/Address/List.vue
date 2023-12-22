<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Address } from '~/types/user/address'

defineProps({
	addresses: {
		type: Array as PropType<Address[] | null>,
		required: true
	},
	displayTotal: {
		type: Boolean,
		required: false,
		default: true
	}
})

const { t } = useI18n()
</script>

<template>
	<div class="w-full grid items-start gap-4">
		<div v-if="displayTotal" class="flex items-center justify-center gap-1">
			<span class="text-[0.75rem] font-semibold text-[#f0c14b]">{{
				addresses?.length
			}}</span>
			<span class="text-[0.75rem] font-semibold text-[#f0c14b]">
				{{ t('pages.account.addresses.total') }}
			</span>
		</div>
		<ul class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<AddressAddNew />
			<template v-for="address in addresses" :key="address.id">
				<AddressCard :address="address" />
			</template>
		</ul>
	</div>
</template>
