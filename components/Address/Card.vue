<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Address } from '~/types/user/address'

const props = defineProps({
	address: {
		type: Object as PropType<Address>,
		required: true
	}
})

const userAddressStore = useUserAddressStore()
const { deleteAddress } = userAddressStore

const { t } = useI18n()
const toast = useToast()
const { contentShorten } = useText()

const deleteAddressEvent = async (id: string) => {
	if (props.address && props.address.isMain) {
		toast.add({
			title: t('components.address.card.delete.cant_delete_main')
		})
		return
	}
	await deleteAddress(id)
		.then(() => {
			toast.add({
				title: t('components.address.card.delete.success')
			})
		})
		.catch(() => {
			toast.add({
				title: t('components.address.card.delete.error')
			})
		})
}
</script>

<template>
	<li
		class="relative w-full grid items-start gap-8 p-5 bg-white text-white dark:bg-zinc-800 dark:text-black rounded-lg sm:py-10 sm:px-4"
	>
		<div v-if="address.isMain" class="absolute top-3 right-3 text-[#f0c14b]">
			<IconMdi:star></IconMdi:star>
		</div>
		<div class="grid grid-cols-[1fr_auto] items-center justify-center gap-2">
			<div class="grid items-center gap-2">
				<h3 class="font-bold text-primary-700 dark:text-primary-100">
					{{ contentShorten(address.title, 0, 25) }}
				</h3>
			</div>
			<div class="grid grid-cols-[auto_auto] items-center gap-2">
				<UButton
					class="w-[2rem] h-[2rem] grid place-items-center rounded-full"
					icon="i-heroicons-pencil"
					:to="`/account/addresses/${address.id}/edit`"
					size="sm"
					:trailing="true"
				/>
				<UButton
					class="w-[2rem] h-[2rem] grid place-items-center rounded-full"
					icon="i-heroicons-trash"
					size="sm"
					:trailing="true"
					color="rose"
					@click="deleteAddressEvent(String(address.id))"
				/>
			</div>
		</div>
		<div class="grid justify-center items-center gap-4">
			<div class="grid items-center gap-2 w-full h-full">
				<span class="text-primary-700 dark:text-primary-100 text-sm font-bold">
					{{ address.firstName }} {{ address.lastName }}
				</span>
				<span class="text-primary-700 dark:text-primary-100 text-sm font-bold">
					{{ address.street }} {{ address.streetNumber }}
				</span>
				<span class="text-primary-700 dark:text-primary-100 text-sm font-bold">
					{{ address.city }} {{ address.zipcode }}
				</span>
				<span class="text-primary-700 dark:text-primary-100 text-sm font-bold">
					{{ address.country }} {{ address.region }}
				</span>
				<span class="text-primary-700 dark:text-primary-100 text-sm font-bold">
					{{ $t('common.floor') }}: {{ address.floor }}
				</span>
				<span class="text-primary-700 dark:text-primary-100 text-sm font-bold">
					{{ $t('common.location_type') }}: {{ address.locationType }}
				</span>
				<span class="text-primary-700 dark:text-primary-100 text-sm font-bold">
					{{ $t('common.phone') }}: {{ address.phone }}
				</span>
				<span class="text-primary-700 dark:text-primary-100 text-sm font-bold">
					{{ $t('common.mobile_phone') }}: {{ address.mobilePhone }}
				</span>
				<span class="text-primary-700 dark:text-primary-100 text-sm font-bold">
					{{ $t('common.notes') }}: {{ address.notes }}
				</span>
			</div>
		</div>
	</li>
</template>
