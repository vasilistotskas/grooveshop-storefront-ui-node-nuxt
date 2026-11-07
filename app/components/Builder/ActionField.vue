<script lang="ts" setup>
import type { SelectItem } from '@nuxt/ui'

const props = defineProps<{
  /** The action's group of fields, from `builderSettingsFields`. */
  field: Extract<BuilderSettingField, { kind: 'group' }>
  settings: Readonly<Record<string, unknown>>
  errors: ReadonlyMap<string, string>
  disabled: boolean
  translation?: BuilderSettingsTranslation
}>()

const emit = defineEmits<{
  /** A new value for the setting at `path`; `undefined` takes it out. */
  update: [path: string, value: unknown]
}>()

const { t } = useStoreI18n('components/Builder/ActionField')
const { settingLabel, optionLabel } = useBuilderLabels()

/** What the kind control offers for "no action": never one of the kinds. */
const NONE = '@none'

const isKind = (value: unknown): value is BuilderActionKind => typeof value === 'string' && value in BUILDER_ACTION_TARGETS

/** An action is the same in every language: while another is edited, the draft's shows and cannot change. */
const source = computed(() => props.translation?.fallback ?? props.settings)
const locked = computed(() => props.disabled || (props.translation !== undefined && !props.translation.translatable.has(props.field.pointer)))

const stored = computed(() => settingAt(source.value, props.field.path) as Record<string, unknown> | undefined)
const storedKind = computed(() => isKind(stored.value?.kind) ? stored.value.kind : undefined)

/**
 * The kind being set up. A kind is chosen before its target: until it has one
 * it is no action, so only a whole action is saved, as `BuilderLinkField` does
 * with a link, and the merchant is not told a choice halfway was refused.
 */
const kind = ref<BuilderActionKind | undefined>(storedKind.value)
watch(storedKind, (next) => {
  if (next !== undefined) kind.value = next
})

const kindField = computed(() => props.field.fields.find(({ path }) => path === `${props.field.path}.kind`))
const items = computed<SelectItem[]>(() => {
  const field = kindField.value
  const options = field?.kind === 'choice' ? field.options : []
  return [
    ...(props.field.required ? [] : [{ label: t('none'), value: NONE }]),
    ...options.map(option => ({ label: optionLabel(`${props.field.path}.kind`, option), value: option })),
  ]
})

const targetField = computed(() => kind.value === undefined
  ? undefined
  : props.field.fields.find(({ path }) => path === `${props.field.path}.${BUILDER_ACTION_TARGETS[kind.value!]}`))

function setKind(next: unknown): void {
  if (next === kind.value) return
  if (!isKind(next)) {
    kind.value = undefined
    emit('update', props.field.path, undefined)
    return
  }
  const target = BUILDER_ACTION_TARGETS[next]
  // A stored action holds only its own target, so a kind that names another finds none here: nothing is left behind.
  const kept = stored.value?.[target]
  kind.value = next
  emit('update', props.field.path, kept === undefined ? undefined : { kind: next, [target]: kept })
}

function setTarget(next: unknown): void {
  const current = kind.value
  if (current === undefined) return
  emit('update', props.field.path, next === undefined ? undefined : { kind: current, [BUILDER_ACTION_TARGETS[current]]: next })
}
</script>

<template>
  <fieldset class="flex flex-col gap-4 rounded-md border border-default p-3">
    <legend class="px-1 text-sm font-medium">
      {{ settingLabel(field.path) }}
    </legend>
    <UFormField :label="settingLabel(`${field.path}.kind`)">
      <USelect
        :model-value="kind ?? NONE"
        :items="items"
        :disabled="locked"
        class="w-full"
        @update:model-value="setKind"
      />
    </UFormField>
    <BuilderSettingField
      v-if="targetField"
      :key="targetField.path"
      :field="targetField"
      :settings="settings"
      :errors="errors"
      :disabled="disabled"
      :translation="translation"
      @update="(_path, next) => setTarget(next)"
    />
    <!-- What Django says of an action as a whole. -->
    <p
      v-if="errors.get(field.path)"
      role="alert"
      class="text-sm text-error"
    >
      {{ errors.get(field.path) }}
    </p>
  </fieldset>
</template>

<i18n lang="yaml">
el:
  none: Χωρίς ενέργεια
en:
  none: No action
</i18n>
