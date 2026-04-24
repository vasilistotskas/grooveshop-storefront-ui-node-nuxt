<script lang="ts" setup>
/**
 * Visual picker for the user's saved delivery addresses.
 *
 * Renders each address as a radio "card" via Nuxt UI's RadioGroup
 * (variant="card"), plus a sentinel card "use a new address" that lets
 * the shopper opt out of their address book and fill the form manually.
 *
 * The component is fully controlled — state lives in ``useCheckoutForm``
 * so the parent Step 1 component can toggle its downstream form
 * sections based on the same selection.
 */
const props = defineProps<{
  addresses: UserAddressDetail[]
  selectedId: number | null
  /** ``saved``: card selected; ``new``: user chose the blank-form card. */
  mode: 'saved' | 'new'
}>()

const emit = defineEmits<{
  select: [id: number]
  new: []
}>()

const { t } = useI18n()

const NEW_ADDRESS_VALUE = '__new__'

type Item = {
  value: number | typeof NEW_ADDRESS_VALUE
  label: string
  description: string
  isMain?: boolean
}

const items = computed<Item[]>(() => {
  const saved: Item[] = props.addresses.map(address => ({
    value: address.id,
    // Keep ``label`` to just the user-given title — the "Κύρια" marker
    // renders separately through the ``#label`` slot so we can theme it
    // in the secondary colour instead of it inheriting the card copy.
    label: address.title,
    description: [
      `${address.firstName} ${address.lastName}`.trim(),
      [address.street, address.streetNumber].filter(Boolean).join(' '),
      [address.zipcode, address.city].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(' · '),
    isMain: address.isMain ?? false,
  }))
  saved.push({
    value: NEW_ADDRESS_VALUE,
    label: t('new_address.label'),
    description: t('new_address.description'),
  })
  return saved
})

/**
 * RadioGroup v-model: the currently-selected address id, or the
 * NEW_ADDRESS_VALUE sentinel when the shopper chose to type fresh info.
 */
const modelValue = computed<number | typeof NEW_ADDRESS_VALUE>({
  get: () => (props.mode === 'new' ? NEW_ADDRESS_VALUE : (props.selectedId ?? NEW_ADDRESS_VALUE)),
  set: (next) => {
    if (next === NEW_ADDRESS_VALUE) {
      emit('new')
    }
    else if (typeof next === 'number') {
      emit('select', next)
    }
  },
})
</script>

<template>
  <URadioGroup
    v-model="modelValue"
    :items="items"
    variant="card"
    color="primary"
    size="md"
    orientation="vertical"
    :ui="{
      fieldset: 'space-y-3',
      item: 'w-full',
    }"
  >
    <template #label="{ item }">
      <span class="flex items-center gap-2">
        <span>{{ (item as Item).label }}</span>
        <span
          v-if="(item as Item).isMain"
          class="text-xs font-medium text-(--ui-secondary)"
        >
          · {{ t('main') }}
        </span>
      </span>
    </template>
  </URadioGroup>
</template>

<i18n lang="yaml">
el:
  main: "Κύρια"
  new_address:
    label: "Νέα διεύθυνση"
    description: "Συμπλήρωσε τα στοιχεία παράδοσης χειροκίνητα για αυτή την παραγγελία."
</i18n>
