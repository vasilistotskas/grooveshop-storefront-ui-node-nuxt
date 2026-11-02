<script lang="ts" setup>
import type { SelectItem } from '@nuxt/ui'

const props = defineProps<{
  field: BuilderSettingField
  /** The node's settings, the field's value read from them by its path. */
  settings: Readonly<Record<string, unknown>>
  /** What is wrong, by field path. */
  errors: ReadonlyMap<string, string>
  disabled: boolean
}>()

const emit = defineEmits<{
  /** A new value for the setting at `path`; `undefined` takes it out (the component's own default). */
  update: [path: string, value: unknown]
}>()

const { t } = useStoreI18n('components/Builder/SettingField')
const { settingLabel, settingHelp, optionLabel, routeLabel } = useBuilderLabels()

/** The value a choice offers for "leave it to the section": never one of a setting's own values. */
const UNSET = '@unset'

const value = computed(() => settingAt(props.settings, props.field.path))
const label = computed(() => settingLabel(props.field.path))
const help = computed(() => settingHelp(props.field.path))
const error = computed(() => props.errors.get(props.field.path))

const text = computed(() => typeof value.value === 'string' ? value.value : '')
const number = computed(() => typeof value.value === 'number' ? value.value : undefined)
const list = computed(() => Array.isArray(value.value) ? value.value.map(String) : [])

/** A choice's items: its values, and "the section's own default" first when the setting may be left out. */
const choiceItems = computed(() => {
  const field = props.field
  if (field.kind !== 'choice' && field.kind !== 'route') return []
  const items = field.options.map(option => ({
    label: field.kind === 'route' ? routeLabel(option) : optionLabel(field.path, option),
    value: option,
  }))
  return field.required ? items : [{ label: t('default'), value: UNSET }, ...items]
})
const segmented = computed(() => props.field.kind === 'choice' && choiceItems.value.length <= BUILDER_SEGMENTED_CHOICE_MAX)
const choice = computed(() => typeof value.value === 'string' ? value.value : UNSET)

/** An optional switch has three states: on, off, and the section's own default. */
const toggleItems = computed(() => [
  { label: t('default'), value: UNSET },
  { label: t('on'), value: 'on' },
  { label: t('off'), value: 'off' },
])
const toggle = computed(() => value.value === true ? 'on' : value.value === false ? 'off' : UNSET)

/** A step that suits the range: whole numbers step by one, a fraction range by a twentieth of it. */
const step = computed(() => {
  const field = props.field
  if (field.kind !== 'number' || field.integer) return 1
  return field.min !== undefined && field.max !== undefined ? (field.max - field.min) / 20 : undefined
})

function set(next: unknown): void {
  emit('update', props.field.path, next)
}

function setChoice(next: unknown): void {
  set(next === UNSET ? undefined : next)
}

function setToggle(next: unknown): void {
  set(next === 'on' ? true : next === 'off' ? false : undefined)
}

function setListItem(index: number, item: string): void {
  set(list.value.map((current, at) => at === index ? item : current))
}

function moveListItem(index: number, delta: -1 | 1): void {
  const next = [...list.value]
  const [item] = next.splice(index, 1)
  next.splice(index + delta, 0, item!)
  set(next)
}
</script>

<template>
  <fieldset
    v-if="field.kind === 'group'"
    class="flex flex-col gap-4 rounded-md border border-default p-3"
  >
    <legend class="px-1 text-sm font-medium">
      {{ label }}
    </legend>
    <BuilderSettingField
      v-for="child in field.fields"
      :key="child.path"
      :field="child"
      :settings="settings"
      :errors="errors"
      :disabled="disabled"
      @update="(path, next) => emit('update', path, next)"
    />
  </fieldset>

  <UFormField
    v-else
    :label="label"
    :help="help"
    :error="error"
    :required="field.required"
    :name="field.path"
  >
    <UInput
      v-if="field.kind === 'text' || field.kind === 'url' || (field.kind === 'record' && (field.refKind === 'page' || field.refKind === 'contentPage'))"
      :model-value="text"
      :type="field.kind === 'url' ? 'url' : 'text'"
      :maxlength="field.kind === 'text' ? field.maxLength : undefined"
      :placeholder="field.kind === 'url' ? t('urlPlaceholder') : undefined"
      :disabled="disabled"
      class="w-full"
      @update:model-value="set"
    />
    <UTextarea
      v-else-if="field.kind === 'textarea'"
      :model-value="text"
      :maxlength="field.maxLength"
      :disabled="disabled"
      autoresize
      :rows="3"
      class="w-full"
      @update:model-value="set"
    />
    <URadioGroup
      v-else-if="segmented"
      :model-value="choice"
      :items="choiceItems"
      orientation="horizontal"
      variant="table"
      indicator="hidden"
      size="sm"
      :disabled="disabled"
      @update:model-value="setChoice"
    />
    <USelect
      v-else-if="field.kind === 'choice' || field.kind === 'route'"
      :model-value="choice"
      :items="(choiceItems as SelectItem[])"
      :disabled="disabled"
      class="w-full"
      @update:model-value="setChoice"
    />
    <USwitch
      v-else-if="field.kind === 'boolean' && field.required"
      :model-value="value === true"
      :disabled="disabled"
      @update:model-value="set"
    />
    <URadioGroup
      v-else-if="field.kind === 'boolean'"
      :model-value="toggle"
      :items="toggleItems"
      orientation="horizontal"
      variant="table"
      indicator="hidden"
      size="sm"
      :disabled="disabled"
      @update:model-value="setToggle"
    />
    <UInputNumber
      v-else-if="field.kind === 'number' || field.kind === 'record'"
      :model-value="number"
      :min="field.kind === 'number' ? field.min : 1"
      :max="field.kind === 'number' ? field.max : undefined"
      :step="field.kind === 'number' ? step : 1"
      :disabled="disabled"
      class="w-full"
      @update:model-value="(next: number | null | undefined) => set(next ?? undefined)"
    />
    <div
      v-else-if="field.kind === 'color'"
      class="flex items-center gap-2"
    >
      <UPopover :disabled="disabled">
        <UButton
          color="neutral"
          variant="outline"
          :aria-label="t('pickColour', { name: label })"
          :disabled="disabled"
        >
          <span
            class="size-5 rounded-sm ring ring-default"
            :style="{ backgroundColor: text || undefined }"
          />
        </UButton>
        <template #content>
          <UColorPicker
            :model-value="text || undefined"
            format="hex"
            class="p-2"
            @update:model-value="(next?: string) => set(next?.toUpperCase())"
          />
        </template>
      </UPopover>
      <UInput
        :model-value="text"
        :placeholder="t('hexPlaceholder')"
        :disabled="disabled"
        class="min-w-0 flex-1"
        @update:model-value="set"
      />
    </div>
    <UInput
      v-else-if="field.kind === 'icon'"
      :model-value="text"
      :placeholder="t('iconPlaceholder')"
      :disabled="disabled"
      :leading-icon="text || undefined"
      class="w-full"
      @update:model-value="set"
    />
    <BuilderLinkField
      v-else-if="field.kind === 'link'"
      :label="label"
      :value="value"
      :disabled="disabled"
      @update="set"
    />
    <div
      v-else-if="field.kind === 'list'"
      class="flex flex-col gap-2"
    >
      <div
        v-for="(item, index) in list"
        :key="index"
        class="flex items-center gap-1"
      >
        <UInput
          :model-value="item"
          :aria-label="t('item', { name: label, number: index + 1 })"
          :disabled="disabled"
          class="min-w-0 flex-1"
          @update:model-value="(next: string) => setListItem(index, next)"
        />
        <UButton
          icon="i-lucide-arrow-up"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('itemUp', { number: index + 1 })"
          :disabled="disabled || index === 0"
          @click="() => moveListItem(index, -1)"
        />
        <UButton
          icon="i-lucide-arrow-down"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('itemDown', { number: index + 1 })"
          :disabled="disabled || index === list.length - 1"
          @click="() => moveListItem(index, 1)"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('itemRemove', { number: index + 1 })"
          :disabled="disabled"
          @click="() => set(list.filter((_, at) => at !== index))"
        />
      </div>
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        size="sm"
        class="self-start"
        :label="t('itemAdd')"
        :disabled="disabled || (field.maxItems !== undefined && list.length >= field.maxItems)"
        @click="() => set([...list, ''])"
      />
    </div>
    <LazyBuilderRichTextField
      v-else-if="field.kind === 'richText'"
      :value="text"
      :label="label"
      :disabled="disabled"
      @update="set"
    />
  </UFormField>
</template>

<i18n lang="yaml">
el:
  default: Προεπιλογή
  "on": Ναι
  "off": Όχι
  urlPlaceholder: https://
  hexPlaceholder: "#1E4FD8"
  iconPlaceholder: i-lucide-star
  pickColour: "Επιλογή χρώματος: {name}"
  item: "{name}, {number}"
  itemUp: "Μετακίνηση πάνω: {number}"
  itemDown: "Μετακίνηση κάτω: {number}"
  itemRemove: "Αφαίρεση: {number}"
  itemAdd: Προσθήκη
en:
  default: Default
  "on": "On"
  "off": "Off"
  urlPlaceholder: https://
  hexPlaceholder: "#1E4FD8"
  iconPlaceholder: i-lucide-star
  pickColour: "Pick a colour for {name}"
  item: "{name}, {number}"
  itemUp: "Move {number} up"
  itemDown: "Move {number} down"
  itemRemove: "Remove {number}"
  itemAdd: Add
</i18n>
