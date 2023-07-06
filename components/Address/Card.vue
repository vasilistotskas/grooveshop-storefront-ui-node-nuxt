<script lang="ts" setup>
import { PropType } from 'vue'
import { Address } from '~/zod/user/address'

const props = defineProps({
	address: {
		type: Object as PropType<Address>,
		required: true
	}
})

const { t } = useLang()
const swal = useSwal()
const toast = useToast()
const router = useRouter()
const { contentShorten } = useText()

const userAddressStore = useUserAddressStore()
const bus = useEventBus<string>('userAddresses')

const deleteAddress = (id: string) => {
	if (props.address && props.address.isMain) {
		toast.error(t('components.address.card.delete.cant_delete_main'))
		return
	}
	swal
		.fire({
			title: t('swal.delete_address.title'),
			text: t('swal.delete_address.text'),
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#0891b2',
			cancelButtonColor: '#ff2c2c',
			width: 420,
			confirmButtonText: t('swal.default.warning.confirm_button_text'),
			cancelButtonText: t('swal.default.warning.cancel_button_text')
		})
		.then((result) => {
			if (!result.isConfirmed) {
				return
			}
			userAddressStore
				.deleteAddress(id)
				.then(async () => {
					await bus.emit('delete', id)
					toast.success(t('components.address.card.delete.success'))
					await swal.fire({
						title: t('swal.delete_address.success.title'),
						text: t('swal.delete_address.success.text'),
						html: t('swal.delete_address.success.html'),
						icon: 'success'
					})
				})
				.catch(() => {
					toast.error(t('components.address.card.delete.error'))
				})
		})
}
</script>

<template>
	<li
		class="address__card p-5 bg-white text-white dark:bg-slate-800 dark:text-black rounded-lg"
	>
		<div v-if="address.isMain" class="address__card__main">
			<IconMdi:star></IconMdi:star>
		</div>
		<div class="address__card__header">
			<div class="address__card__header__title">
				<h3
					class="address__card__header__title__value font-bold text-gray-700 dark:text-gray-200"
				>
					{{ contentShorten(address.title, 0, 25) }}
				</h3>
			</div>
			<div class="address__card__header__actions">
				<Button
					class="address__card__header__actions__button"
					type="link"
					:to="`/account/addresses/${address.id}/edit`"
					size="sm"
					:style="'secondary'"
				>
					<span class="hidden">{{ t('pages.account.addresses.edit.title') }}</span>
					<IconFa6Solid:pencil class="text-cyan-600" />
				</Button>
				<Button
					class="address__card__header__actions__button"
					type="button"
					size="sm"
					:style="'secondary'"
					@click="deleteAddress(String(address.id))"
				>
					<span class="hidden">{{ t('pages.account.addresses.delete') }}</span>
					<IconFa6Solid:trash class="text-red-600" />
				</Button>
			</div>
		</div>
		<div class="address__card__body">
			<div class="address__card__body__address">
				<span
					class="address__card__body__address__value text-gray-700 dark:text-gray-200"
				>
					{{ address.firstName }} {{ address.lastName }}
				</span>
				<span
					class="address__card__body__address__value text-gray-700 dark:text-gray-200"
				>
					{{ address.street }} {{ address.streetNumber }}
				</span>
				<span
					class="address__card__body__address__value text-gray-700 dark:text-gray-200"
				>
					{{ address.city }} {{ address.zipcode }}
				</span>
				<span
					class="address__card__body__address__value text-gray-700 dark:text-gray-200"
				>
					{{ address.country }} {{ address.region }}
				</span>
				<span
					class="address__card__body__address__value text-gray-700 dark:text-gray-200"
				>
					{{ $t('common.floor') }}: {{ address.floor }}
				</span>
				<span
					class="address__card__body__address__value text-gray-700 dark:text-gray-200"
				>
					{{ $t('common.location_type') }}: {{ address.locationType }}
				</span>
				<span
					class="address__card__body__address__value text-gray-700 dark:text-gray-200"
				>
					{{ $t('common.phone') }}: {{ address.phone }}
				</span>
				<span
					class="address__card__body__address__value text-gray-700 dark:text-gray-200"
				>
					{{ $t('common.mobile_phone') }}: {{ address.mobilePhone }}
				</span>
				<span
					class="address__card__body__address__value text-gray-700 dark:text-gray-200"
				>
					{{ $t('common.notes') }}: {{ address.notes }}
				</span>
			</div>
		</div>
	</li>
</template>

<style lang="scss" scoped>
.address__card {
	position: relative;
	width: 100%;
	display: grid;
	align-items: start;
	gap: 2rem;
	@media screen and (min-width: 961px) {
		overflow-y: hidden;
	}
	@media screen and (min-width: 634px) {
		padding: 40px 16px 16px;
	}
	&__header {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		justify-items: center;
		gap: 0.5rem;
		&__title {
			display: grid;
			align-items: center;
			gap: 0.5rem;
			&__value,
			&__label {
				font-size: 1.3rem;
			}
		}
		&__actions {
			display: grid;
			grid-template-columns: auto auto;
			align-items: center;
			gap: 0.5rem;
			&__button {
				width: 2rem;
				height: 2rem;
				border-radius: 50%;
				display: grid;
				place-items: center;
				cursor: pointer;
			}
		}
	}
	&__body {
		display: grid;
		justify-items: center;
		align-items: center;
		gap: 1rem;
		&__address {
			display: grid;
			align-items: center;
			gap: 0.5rem;
			width: 100%;
			height: 100%;
			&__value {
				font-size: 0.875rem;
				font-weight: 400;
			}
		}
	}
	&__main {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		color: #f0c14b;
	}
}
</style>
