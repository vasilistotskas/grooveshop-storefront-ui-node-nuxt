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
    default: false,
  },
})

const emit = defineEmits([
  'address-delete',
])

const { t } = useI18n()
</script>

<template>
  <div class="grid gap-6">
    <div
      v-if="displayTotal"
      class="flex items-center justify-center"
    >
      <UBadge
        color="primary"
        variant="subtle"
        size="lg"
        class="px-4 py-2"
      >
        <span class="text-sm font-semibold">
          {{ t('total', addressesCount) }}
        </span>
      </UBadge>
    </div>

    <ul
      class="
        grid grid-cols-1 gap-4
        sm:grid-cols-2
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
</template>

<i18n lang="yaml">
el:
  total: Χωρίς Διευθύνσεις | 1 Διεύθυνση | {count} Διευθύνσεις
</i18n>
