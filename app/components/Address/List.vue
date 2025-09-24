<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  addresses: {
    type: Array as PropType<UserAddress[] | null>,
    required: true,
  },
  addressesCount: {
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

const emit = defineEmits([
  'address-delete',
])

const { t } = useI18n()
</script>

<template>
  <div class="grid gap-4">
    <div class="grid w-full items-start gap-4">
      <div
        v-if="displayTotal"
        class="flex items-center justify-center gap-1"
      >
        <span
          class="text-sm font-semibold"
        >
          {{ t('total', addressesCount) }}
        </span>
      </div>
      <ul
        class="
          grid grid-cols-1 gap-4
          md:grid-cols-2
          lg:grid-cols-3
        "
      >
        <AddressCard
          v-for="address in addresses"
          :key="address.id"
          :address="address"
          @address-delete="emit('address-delete')"
        />
      </ul>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  total: Χωρίς Διευθύνσεις | 1 Διεύθυνση | {count} Διευθύνσεις
</i18n>
