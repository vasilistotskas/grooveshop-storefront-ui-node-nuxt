<script lang="ts" setup>
import type { PropType } from 'vue'

import type { UserAddress } from '~/types/user/address'

const props = defineProps({
  address: {
    type: Object as PropType<UserAddress>,
    required: true,
  },
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
      title: t('components.address.card.delete.cant_delete_main'),
    })
    return
  }

  await useFetch(`/api/user/addresses/${address?.value.id}`, {
    method: 'DELETE',
    onRequestError() {
      toast.add({
        title: t('components.address.card.delete.error'),
        color: 'red',
      })
    },
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      deleteAddress(address?.value.id)
      toast.add({
        title: t('components.address.card.delete.success'),
      })
    },
    onResponseError() {
      toast.add({
        title: t('components.address.card.delete.error'),
        color: 'red',
      })
    },
  })
}
</script>

<template>
  <li
    v-if="address"
    class="relative grid w-full items-start gap-8 rounded-lg bg-white p-2 text-white dark:bg-zinc-900 dark:text-black sm:px-4 sm:py-10 md:p-5"
  >
    <div
      v-if="address.isMain"
      class="absolute right-24 top-3 text-[#f0c14b] md:right-2 md:top-1"
    >
      <IconMdi:star />
    </div>
    <div class="grid grid-cols-[1fr_auto] items-center justify-center gap-2">
      <div class="grid items-center gap-2">
        <h3
          class="text-primary-800 dark:text-primary-100 text-center text-xl font-bold"
        >
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
    <div class="grid gap-2 md:items-center md:justify-center md:gap-4">
      <div
        class="grid w-full grid-cols-2 items-center gap-2 overflow-hidden md:h-64 md:grid-cols-1"
      >
        <span
          v-if="address.firstName || address.lastName"
          class="text-primary-800 dark:text-primary-100 text-sm font-bold"
        >
          {{ address.firstName }} {{ address.lastName }}
        </span>
        <span
          v-if="address.street || address.streetNumber"
          class="text-primary-800 dark:text-primary-100 text-sm font-bold"
        >
          {{ address.street }} {{ address.streetNumber }}
        </span>
        <span
          v-if="address.city || address.zipcode"
          class="text-primary-800 dark:text-primary-100 text-sm font-bold"
        >
          {{ address.city }} {{ address.zipcode }}
        </span>
        <span
          v-if="address.country || address.region"
          class="text-primary-800 dark:text-primary-100 text-sm font-bold"
        >
          {{ address.country }} {{ address.region }}
        </span>
        <span
          v-if="address.floor"
          class="text-primary-800 dark:text-primary-100 text-sm font-bold"
        >
          {{ $t('common.floor') }}: {{ address.floor }}
        </span>
        <span
          v-if="address.locationType"
          class="text-primary-800 dark:text-primary-100 text-sm font-bold"
        >
          {{ $t('common.location_type') }}: {{ address.locationType }}
        </span>
        <span
          v-if="address.phone"
          class="text-primary-800 dark:text-primary-100 text-sm font-bold"
        >
          {{ $t('common.phone') }}: {{ address.phone }}
        </span>
        <span
          v-if="address.mobilePhone"
          class="text-primary-800 dark:text-primary-100 text-sm font-bold"
        >
          {{ $t('common.mobile_phone') }}: {{ address.mobilePhone }}
        </span>
        <span
          v-if="address.notes"
          class="text-primary-800 dark:text-primary-100 text-sm font-bold"
        >
          {{ $t('common.notes') }}: {{ address.notes }}
        </span>
      </div>
    </div>
  </li>
</template>
