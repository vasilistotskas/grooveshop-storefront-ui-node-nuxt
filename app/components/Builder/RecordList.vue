<script lang="ts" setup>
const props = defineProps<{
  /** The kind of record the list holds. */
  kind: LinkRefKind
  /** The ids chosen, in the order they are kept. */
  ids: readonly number[]
  /** Most records the list may hold. */
  max: number
  /** Whether the order is the merchant's to set (a hand-picked list); else the list is a set. */
  ordered: boolean
  /** The setting's name, for the controls' accessible names. */
  label: string
  disabled: boolean
}>()

const emit = defineEmits<{
  update: [ids: number[]]
}>()

const { t } = useStoreI18n('components/Builder/RecordList')

// The names of the records chosen, asked once for all of them.
const { data: labels } = useLazyApi('/api/builder/link-labels', {
  query: computed(() => ({ [props.kind]: props.ids.join(',') })),
  enabled: computed(() => props.ids.length > 0),
})

const rows = computed(() => props.ids.map((id) => {
  const known = labels.value?.[props.kind]?.[String(id)]
  return { id, label: known?.label ?? t('record', { id }), unavailable: known !== undefined && known.active !== true }
}))

const full = computed(() => props.ids.length >= props.max)

function add(ref: BuilderLinkRef | undefined): void {
  if (ref && typeof ref.id === 'number' && !props.ids.includes(ref.id)) emit('update', [...props.ids, ref.id])
}

function remove(index: number): void {
  emit('update', props.ids.filter((_, at) => at !== index))
}

function move(index: number, delta: -1 | 1): void {
  const next = [...props.ids]
  const [id] = next.splice(index, 1)
  next.splice(index + delta, 0, id!)
  emit('update', next)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <ul
      v-if="rows.length"
      class="flex flex-col gap-1"
    >
      <li
        v-for="(row, index) in rows"
        :key="row.id"
        class="flex items-center gap-1"
      >
        <span class="min-w-0 flex-1 truncate text-sm">
          {{ row.label }}
        </span>
        <UTooltip
          v-if="row.unavailable"
          :text="t('unavailable')"
        >
          <UIcon
            name="i-lucide-triangle-alert"
            class="size-4 text-warning"
            :aria-label="t('unavailable')"
          />
        </UTooltip>
        <UButton
          v-if="ordered"
          icon="i-lucide-arrow-up"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('up', { name: row.label })"
          :disabled="disabled || index === 0"
          @click="() => move(index, -1)"
        />
        <UButton
          v-if="ordered"
          icon="i-lucide-arrow-down"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('down', { name: row.label })"
          :disabled="disabled || index === rows.length - 1"
          @click="() => move(index, 1)"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('remove', { name: row.label })"
          :disabled="disabled"
          @click="() => remove(index)"
        />
      </li>
    </ul>
    <BuilderRecordPicker
      :kinds="[kind]"
      :value="undefined"
      :label="t('add', { name: label })"
      :clearable="false"
      :disabled="disabled || full"
      @update="add"
    />
    <p
      v-if="full"
      class="text-xs text-muted"
    >
      {{ t('full', { max }) }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  record: "Εγγραφή #{id}"
  unavailable: Δεν είναι πια διαθέσιμο· θα παραλειφθεί στη δημοσίευση.
  up: "Μετακίνηση πάνω: {name}"
  down: "Μετακίνηση κάτω: {name}"
  remove: "Αφαίρεση: {name}"
  add: "Προσθήκη: {name}"
  full: "Έχετε φτάσει το όριο των {max}."
en:
  record: "Record #{id}"
  unavailable: No longer available; it is left out when published.
  up: "Move up: {name}"
  down: "Move down: {name}"
  remove: "Remove: {name}"
  add: "Add: {name}"
  full: "You have reached the limit of {max}."
</i18n>
