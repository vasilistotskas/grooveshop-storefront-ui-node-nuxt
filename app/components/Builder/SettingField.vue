<script lang="ts" setup>
import type { SelectItem } from '@nuxt/ui'

const props = defineProps<{
  field: BuilderSettingField
  /** The node's settings, the field's value read from them by its path. */
  settings: Readonly<Record<string, unknown>>
  /** What is wrong, by field path. */
  errors: ReadonlyMap<string, string>
  disabled: boolean
  /**
   * Set while a language other than the draft's is edited: `settings` then
   * holds the node's translations, and `fallback` the draft's settings.
   */
  translation?: BuilderSettingsTranslation
}>()

const emit = defineEmits<{
  /** A new value for the setting at `path`; `undefined` takes it out (the component's own default). */
  update: [path: string, value: unknown]
}>()

const { t } = useStoreI18n('components/Builder/SettingField')
const { settingLabel, settingHelp, optionLabel, routeLabel } = useBuilderLabels()

/** The value a choice offers for "leave it to the section": never one of a setting's own values. */
const UNSET = '@unset'

/** Whether the field is edited in the language being edited: always in the draft's, a translatable one in another. */
const translatable = computed(() => !props.translation || props.translation.translatable.has(props.field.pointer))
/** The draft's value of a translatable field while it is translated: what the page shows until it is. */
const fallback = computed(() => props.translation && translatable.value ? settingAt(props.translation.fallback, props.field.path) : undefined)
const fallbackText = computed(() => typeof fallback.value === 'string' && fallback.value !== '' ? fallback.value : undefined)
const value = computed(() => props.translation && !translatable.value
  ? settingAt(props.translation.fallback, props.field.path)
  : settingAt(props.settings, props.field.path))
/** A field the language being edited cannot change: the same in every language. */
const locked = computed(() => props.disabled || !translatable.value)
/** A translatable field with text in the draft and none in the language being edited. */
const untranslated = computed(() => props.translation !== undefined && translatable.value && fallback.value !== undefined && fallback.value !== '' && (value.value === undefined || value.value === ''))
const label = computed(() => settingLabel(props.field.path))
const help = computed(() => settingHelp(props.field.path))
const error = computed(() => props.errors.get(props.field.path))

const text = computed(() => typeof value.value === 'string' ? value.value : '')
const number = computed(() => typeof value.value === 'number' ? value.value : undefined)
const list = computed(() => Array.isArray(value.value) ? value.value.map(String) : [])
/** The image ids of a list of images, in order. */
const mediaIds = computed(() => Array.isArray(value.value) ? value.value.filter((id): id is number => typeof id === 'number') : [])
/** Whether a list may take one more entry: the schema's own `maxItems`. */
const hasRoom = computed(() => {
  const field = props.field
  if (field.kind !== 'list' && field.kind !== 'mediaList') return true
  const count = field.kind === 'mediaList' ? mediaIds.value.length : list.value.length
  return field.maxItems === undefined || count < field.maxItems
})

/**
 * The kind of record a record setting names (`refs`): always one a link may
 * name, and so the record picker finds (a media id is a `media` field).
 */
const recordKind = computed(() => {
  const field = props.field
  return field.kind === 'record' ? LINK_REF_KINDS.find(kind => kind === field.refKind) : undefined
})
const record = computed(() => {
  const kind = recordKind.value
  const stored = value.value
  return kind && (typeof stored === 'number' || typeof stored === 'string') ? builderLinkRefOf(kind, stored) : undefined
})

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

/** `items` with the entry at `index` moved by `delta`. */
function moved<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(index + delta, 0, item!)
  return next
}

function moveListItem(index: number, delta: -1 | 1): void {
  set(moved(list.value, index, delta))
}

/**
 * An image of a list of images: chosen, or taken out when it is `undefined`,
 * which is also what the field emits when the library deletes the image it
 * holds. A list cannot keep an empty slot (the schema takes ids only, and
 * Django refuses anything else), so that entry goes and the ones after it move up.
 */
function setMediaItem(index: number, id: number | undefined): void {
  set(id === undefined ? mediaIds.value.filter((_, at) => at !== index) : mediaIds.value.map((current, at) => at === index ? id : current))
}

/** A new last image; the control for it stays empty, so there is never an entry without one. */
function addMediaItem(id: number | undefined): void {
  if (id !== undefined) set([...mediaIds.value, id])
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
      :translation="translation"
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
    <template
      v-if="translation"
      #hint
    >
      <UBadge
        v-if="untranslated"
        color="warning"
        variant="subtle"
        size="sm"
        :label="t('untranslated')"
      />
      <span
        v-else-if="!translatable"
        class="text-xs text-muted"
      >{{ t('sameEverywhere') }}</span>
    </template>
    <UInput
      v-if="field.kind === 'text' || field.kind === 'url'"
      :model-value="text"
      :type="field.kind === 'url' ? 'url' : 'text'"
      :maxlength="field.kind === 'text' ? field.maxLength : undefined"
      :placeholder="field.kind === 'url' ? t('urlPlaceholder') : fallbackText"
      :disabled="locked"
      class="w-full"
      @update:model-value="set"
    />
    <UTextarea
      v-else-if="field.kind === 'textarea'"
      :model-value="text"
      :placeholder="fallbackText"
      :maxlength="field.maxLength"
      :disabled="locked"
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
      :disabled="locked"
      @update:model-value="setChoice"
    />
    <USelect
      v-else-if="field.kind === 'choice' || field.kind === 'route'"
      :model-value="choice"
      :items="(choiceItems as SelectItem[])"
      :disabled="locked"
      class="w-full"
      @update:model-value="setChoice"
    />
    <USwitch
      v-else-if="field.kind === 'boolean' && field.required"
      :model-value="value === true"
      :disabled="locked"
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
      :disabled="locked"
      @update:model-value="setToggle"
    />
    <BuilderRecordPicker
      v-else-if="recordKind"
      :kinds="[recordKind]"
      :value="record"
      :label="label"
      :clearable="!field.required"
      :disabled="locked"
      @update="(next: BuilderLinkRef | undefined) => set(next?.id)"
    />
    <BuilderMediaField
      v-else-if="field.kind === 'media'"
      :value="value"
      :label="label"
      :clearable="!field.required"
      :disabled="locked"
      @update="set"
    />
    <BuilderQueryField
      v-else-if="field.kind === 'query'"
      :field="field"
      :value="value"
      :label="label"
      :disabled="locked"
      @update="(next: BuilderQueryDescriptor) => set(next)"
    />
    <UInputNumber
      v-else-if="field.kind === 'number'"
      :model-value="number"
      :min="field.min"
      :max="field.max"
      :step="step"
      :disabled="locked"
      class="w-full"
      @update:model-value="(next: number | null | undefined) => set(next ?? undefined)"
    />
    <div
      v-else-if="field.kind === 'color'"
      class="flex items-center gap-2"
    >
      <UPopover :disabled="locked">
        <UButton
          color="neutral"
          variant="outline"
          :aria-label="t('pickColour', { name: label })"
          :disabled="locked"
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
        :disabled="locked"
        class="min-w-0 flex-1"
        @update:model-value="set"
      />
    </div>
    <UInput
      v-else-if="field.kind === 'icon'"
      :model-value="text"
      :placeholder="t('iconPlaceholder')"
      :disabled="locked"
      :leading-icon="text || undefined"
      class="w-full"
      @update:model-value="set"
    />
    <BuilderLinkField
      v-else-if="field.kind === 'link'"
      :label="label"
      :value="value"
      :disabled="locked"
      @update="set"
    />
    <div
      v-else-if="field.kind === 'mediaList'"
      class="flex flex-col gap-3"
    >
      <div
        v-for="(id, index) in mediaIds"
        :key="index"
        class="flex items-start gap-1"
      >
        <BuilderMediaField
          :value="id"
          :label="t('item', { name: label, number: index + 1 })"
          :clearable="false"
          :disabled="locked"
          class="min-w-0 flex-1"
          @update="(next: number | undefined) => setMediaItem(index, next)"
        />
        <UButton
          icon="i-lucide-arrow-up"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('itemUp', { number: index + 1 })"
          :disabled="locked || index === 0"
          @click="() => set(moved(mediaIds, index, -1))"
        />
        <UButton
          icon="i-lucide-arrow-down"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('itemDown', { number: index + 1 })"
          :disabled="locked || index === mediaIds.length - 1"
          @click="() => set(moved(mediaIds, index, 1))"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('itemRemove', { number: index + 1 })"
          :disabled="locked"
          @click="() => set(mediaIds.filter((_, at) => at !== index))"
        />
      </div>
      <BuilderMediaField
        v-if="hasRoom"
        :value="undefined"
        :label="t('item', { name: label, number: mediaIds.length + 1 })"
        :clearable="false"
        :disabled="locked"
        @update="addMediaItem"
      />
    </div>
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
          :disabled="locked"
          class="min-w-0 flex-1"
          @update:model-value="(next: string) => setListItem(index, next)"
        />
        <UButton
          icon="i-lucide-arrow-up"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('itemUp', { number: index + 1 })"
          :disabled="locked || index === 0"
          @click="() => moveListItem(index, -1)"
        />
        <UButton
          icon="i-lucide-arrow-down"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('itemDown', { number: index + 1 })"
          :disabled="locked || index === list.length - 1"
          @click="() => moveListItem(index, 1)"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('itemRemove', { number: index + 1 })"
          :disabled="locked"
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
        :disabled="locked || !hasRoom"
        @click="() => set([...list, ''])"
      />
    </div>
    <LazyBuilderRichTextField
      v-else-if="field.kind === 'richText'"
      :value="text"
      :label="label"
      :disabled="locked"
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
  untranslated: Χωρίς μετάφραση
  sameEverywhere: Ίδιο σε κάθε γλώσσα
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
  untranslated: Not translated
  sameEverywhere: Same in every language
</i18n>
