<script lang="ts" setup>
/**
 * The shopper's saved delivery addresses on checkout step 1, as the
 * board draws them: one radio card each (its name, who it is for, street
 * and postcode with city), the picked one in the accent tint, and a
 * "New address" button that switches to typing one by hand.
 *
 * Fully controlled — state lives in ``useCheckoutForm`` so the parent
 * step can show or hide its address fields from the same selection.
 *
 * An address that fails checkout's rules (no region, no phone, a
 * postcode its country rejects) says it needs updating. Picking it keeps
 * its card picked while the step opens its fields to complete.
 */
const props = defineProps<{
  addresses: UserAddressDetail[]
  selectedId: number | null
  /** Ids of the addresses that fail checkout's rules. */
  needingUpdate: number[]
  /**
   * ``saved``: the picked card stands for the address fields; ``new``:
   * the fields are open, for the picked card's address or a new one.
   */
  mode: 'saved' | 'new'
}>()

const emit = defineEmits<{
  select: [id: number]
  new: []
}>()

const { t } = useStoreI18n('components/Checkout/SavedAddresses')

type Item = {
  value: number
  label: string
  isMain: boolean
  needsUpdate: boolean
  recipient: string
  street: string
  city: string
}

const items = computed<Item[]>(() => props.addresses.map(address => ({
  value: address.id,
  label: address.title,
  isMain: address.isMain ?? false,
  needsUpdate: props.needingUpdate.includes(address.id),
  recipient: `${address.firstName} ${address.lastName}`.trim(),
  street: [address.street, address.streetNumber].filter(Boolean).join(' '),
  city: [address.zipcode, address.city].filter(Boolean).join(' '),
})))

/** The picked address id; nothing is picked while the shopper types a new one. */
const modelValue = computed<number | undefined>({
  get: () => props.selectedId ?? undefined,
  set: (next) => {
    if (typeof next === 'number') emit('select', next)
  },
})

const typingNew = computed(() => props.mode === 'new' && props.selectedId === null)
</script>

<template>
  <div class="flex flex-col gap-3">
    <URadioGroup
      v-model="modelValue"
      :items="items"
      :legend="t('legend')"
      variant="card"
      color="secondary"
      size="md"
      :ui="{
        legend: 'sr-only',
        fieldset: `
          grid grid-cols-1 gap-3
          sm:grid-cols-2
        `,
        item: 'w-full',
      }"
    >
      <template #label="{ item }">
        <span class="flex items-center gap-2">
          <span>{{ (item as Item).label }}</span>
          <span
            v-if="(item as Item).isMain"
            class="text-xs font-medium text-toned"
          >
            · {{ t('main') }}
          </span>
          <UBadge
            v-if="(item as Item).needsUpdate"
            color="warning"
            variant="subtle"
            size="sm"
            icon="i-lucide-triangle-alert"
            :label="t('needs_update')"
          />
        </span>
      </template>
      <template #description="{ item }">
        <span class="flex flex-col">
          <span>{{ (item as Item).recipient }}</span>
          <span>{{ (item as Item).street }}</span>
          <span>{{ (item as Item).city }}</span>
        </span>
      </template>
    </URadioGroup>

    <div>
      <UButton
        color="neutral"
        :variant="typingNew ? 'soft' : 'outline'"
        icon="i-lucide-plus"
        :aria-pressed="typingNew"
        @click="() => emit('new')"
      >
        {{ t('new_address') }}
      </UButton>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  legend: Αποθηκευμένες διευθύνσεις
  main: "Κύρια"
  needs_update: Χρειάζεται ενημέρωση
  new_address: Νέα διεύθυνση
en:
  legend: Saved addresses
  main: "Main"
  needs_update: Needs updating
  new_address: New address
</i18n>
