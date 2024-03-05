<script lang="ts" setup>
import type { PropType } from 'vue'

import type { UserAddress } from '~/types/user/address'

const props = defineProps({
	address: {
		type: Object as PropType<UserAddress>,
		required: true
	}
})

const { address } = toRefs(props)

const userStore = useUserStore()
const { deleteAddress } = userStore

const { t } = useI18n()
const toast = useToast()
const { contentShorten } = useText()

const submit = async () => {
	if (address?.value && address?.value.isMain) {
		toast.add({
			title: t('components.address.card.delete.cant_delete_main')
		})
		return
	}

	await useFetch(`/api/user/addresses/${address?.value.id}`, {
		method: 'DELETE',
		onRequestError() {
			toast.add({
				title: t('components.address.card.delete.error'),
				color: 'red'
			})
		},
		onResponse() {
			deleteAddress(address?.value.id)
			toast.add({
				title: t('components.address.card.delete.success')
			})
		},
		onResponseError() {
			toast.add({
				title: t('components.address.card.delete.error'),
				color: 'red'
			})
		}
	})
}
</script>

<template>
  <li
    v-if="address"
    class="relative grid w-full items-start gap-8 rounded-lg bg-white p-2 text-white dark:bg-zinc-800 dark:text-black sm:px-4 sm:py-10 md:p-5"
  >
    <div v-if="address.isMain" class="absolute right-24 top-3 text-[#f0c14b] md:right-3">
      <IconMdi:star />
    </div>
    <div class="grid grid-cols-[1fr_auto] items-center justify-center gap-2">
      <div class="grid items-center gap-2">
        <h3 class="text-primary-700 dark:text-primary-100 text-center text-xl font-bold">
          {{ contentShorten(address.title, 0, 25) }}
        </h3>
      </div>
      <div class="grid grid-cols-[auto_auto] items-center gap-2">
        <UButton
          class="grid h-[2rem] w-[2rem] place-items-center rounded-full"
          icon="i-heroicons-pencil"
          :to="`/account/addresses/${address.id}/edit`"
          size="sm"
          :trailing="true"
          color="white"
        />
        <UButton
          class="grid h-[2rem] w-[2rem] place-items-center rounded-full"
          icon="i-heroicons-trash"
          size="sm"
          :trailing="true"
          color="rose"
          @click="submit"
        />
      </div>
    </div>
    <div class="grid items-center justify-center gap-4">
      <div class="grid h-64 w-full items-center gap-2 overflow-hidden">
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
