<script lang="ts" setup>
import { PropType } from 'vue'
import { Address } from '~/types/user/address'

const props = defineProps({
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

const { t } = useLang()
</script>

<template>
	<div class="address-list gap-4">
		<div class="address-list-header">
			<div v-if="displayTotal" class="address-list-header-total">
				<span class="address-list-header-total-value">{{ addresses?.length }}</span>
				<span class="address-list-header-total-label">
					{{ t('pages.account.addresses.total') }}
				</span>
			</div>
		</div>
		<ul class="address-list-body">
			<AddressAddNew />
			<template v-for="address in addresses" :key="address.id">
				<AddressCard :address="address" />
			</template>
		</ul>
	</div>
</template>

<style lang="scss" scoped>
.address-list {
	width: 100%;
	display: grid;
	align-items: start;

	&-header {
		&-total {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 0.25rem;

			&-value,
			&-label {
				font-size: 0.75rem;
				font-weight: 600;
				color: #f0c14b;
			}
		}
	}

	&-body {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(4, 1fr);

		@media screen and (width <= 1199px) {
			grid-template-columns: repeat(3, 1fr);
		}

		@media screen and (width <= 991px) {
			grid-template-columns: repeat(2, 1fr);
		}

		@media screen and (width <= 767px) {
			grid-template-columns: repeat(1, 1fr);
		}
	}
}
</style>
