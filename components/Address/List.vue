<script lang="ts" setup>
import type { PropType } from 'vue'

import type { UserAddress } from '~/types/user/address'

defineProps({
  addresses: {
    type: Array as PropType<UserAddress[] | null>,
    required: true,
  },
  addressesTotal: {
    type: Number,
    required: false,
    default: 0,
  },
  displayTotal: {
    type: Boolean,
    required: false,
    default: true,
  },
})
</script>

<template>
  <div class="grid w-full items-start gap-4">
    <div v-if="displayTotal" class="flex items-center justify-center gap-1">
      <span class="text-sm font-semibold text-yellow-600">
        {{ $t('pages.account.addresses.total', addressesTotal) }}
      </span>
    </div>
    <ul
      class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <AddressAddNew />
      <AddressCard
        v-for="address in addresses"
        :key="address.id"
        :address="address"
      />
    </ul>
  </div>
</template>
