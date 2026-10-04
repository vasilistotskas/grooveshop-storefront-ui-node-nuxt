<script lang="ts" setup>
/**
 * The shopper's saved delivery addresses on checkout step 1, as the
 * board draws them: one radio card each (its name, who it is for, street
 * and postcode with city), the picked one in the accent tint, and a
 * "New address" button that switches to typing one by hand.
 *
 * Fully controlled — state lives in ``useCheckoutForm`` so the parent
 * step can show or hide its address fields from the same selection.
 */
const props = defineProps<{
  addresses: UserAddressDetail[]
  selectedId: number | null
  /** ``saved``: a card is selected; ``new``: the shopper chose to type one. */
  mode: 'saved' | 'new'
}>()

const emit = defineEmits<{
  select: [id: number]
  new: []
}>()

const { t } = useI18n()

type Item = {
  value: number
  label: string
  isMain: boolean
  recipient: string
  street: string
  city: string
}

const items = computed<Item[]>(() => props.addresses.map(address => ({
  value: address.id,
  label: address.title,
  isMain: address.isMain ?? false,
  recipient: `${address.firstName} ${address.lastName}`.trim(),
  street: [address.street, address.streetNumber].filter(Boolean).join(' '),
  city: [address.zipcode, address.city].filter(Boolean).join(' '),
})))

/** The picked address id; nothing is picked while the shopper types a new one. */
const modelValue = computed<number | undefined>({
  get: () => (props.mode === 'new' ? undefined : (props.selectedId ?? undefined)),
  set: (next) => {
    if (typeof next === 'number') emit('select', next)
  },
})
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
        :variant="mode === 'new' ? 'soft' : 'outline'"
        icon="i-lucide-plus"
        :aria-pressed="mode === 'new'"
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
  new_address: Νέα διεύθυνση
en:
  legend: Saved addresses
  main: "Main"
  new_address: New address
</i18n>
