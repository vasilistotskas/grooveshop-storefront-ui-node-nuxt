<script lang="ts" setup>
import { DEFAULT_LOCALE } from '~~/i18n/locales'

/**
 * The open page's own settings, edited in the settings pane: its title,
 * description and keywords for search engines, and its main heading where
 * its body draws the store's name in its place (`builderPageSettingFields`).
 * Each is written per language like a translatable setting of a section:
 * the draft's in the default language, a translation in another, which
 * falls back to the draft's. Every change goes through the editor store, so
 * it is undone, saved and checked like any other.
 */
const { t } = useStoreI18n('components/Builder/PageSettings')
const { documentSettingLabel, documentSettingHelp } = useBuilderLabels()
const store = useBuilderEditorStore()
const autosave = useBuilderAutosaveStore()
const { documentKey, locale } = useBuilderEditorView()

const document = computed(() => documentKey.value ? store.opened[documentKey.value] : undefined)
const fields = computed(() => documentKey.value ? builderPageSettingFields(documentKey.value) : [])
/** The language written to, when it is not the draft's. */
const translating = computed(() => locale.value === DEFAULT_LOCALE ? undefined : locale.value)

/** A setting's text in the language being edited, and the draft's it falls back to. */
const valueOf = (key: string): string => document.value ? builderPageSettingValue(document.value.copy, key, translating.value) : ''
const fallbackOf = (key: string): string | undefined =>
  translating.value && document.value ? builderPageSettingValue(document.value.copy, key) || undefined : undefined

/** What is wrong with a setting: too long here, or refused by the last save (`/settings/<key>`, or its translation). */
const errors = computed(() => {
  const byKey = new Map<string, string>()
  for (const field of fields.value) {
    if (field.maxLength !== undefined && valueOf(field.key).length > field.maxLength) byKey.set(field.key, t('tooLong'))
  }
  const key = documentKey.value
  for (const problem of key ? autosave.saves[key]?.problems ?? [] : []) {
    const setting = builderProblemPageSetting(problem.path, translating.value)
    if (setting && !byKey.has(setting)) byKey.set(setting, problem.message)
  }
  return byKey
})

function update(key: string, value: string): void {
  const current = document.value
  if (!current || !documentKey.value) return
  store.change(documentKey.value, setBuilderPageSetting(current.copy, key, value, translating.value), {
    coalesce: `${locale.value}/${BUILDER_DOCUMENT_NODE_ID}/${key}`,
  })
}
</script>

<template>
  <form
    v-if="document && fields.length"
    class="flex flex-col gap-4"
    novalidate
    @submit.prevent
  >
    <UFormField
      v-for="field in fields"
      :key="field.key"
      :label="documentSettingLabel(field.key)"
      :help="documentSettingHelp(field.key)"
      :error="errors.get(field.key)"
      :name="field.key"
    >
      <template
        v-if="field.maxLength !== undefined"
        #hint
      >
        <span class="text-xs text-muted tabular-nums">{{ valueOf(field.key).length }}/{{ field.maxLength }}</span>
      </template>
      <UTextarea
        v-if="field.maxLength !== undefined && field.maxLength >= BUILDER_TEXTAREA_MIN_LENGTH"
        :model-value="valueOf(field.key)"
        :placeholder="fallbackOf(field.key)"
        :maxlength="field.maxLength"
        :disabled="!store.canEdit"
        autoresize
        :rows="3"
        class="w-full"
        @update:model-value="(value: string) => update(field.key, value)"
      />
      <UInput
        v-else
        :model-value="valueOf(field.key)"
        :placeholder="fallbackOf(field.key)"
        :maxlength="field.maxLength"
        :disabled="!store.canEdit"
        class="w-full"
        @update:model-value="(value: string) => update(field.key, value)"
      />
    </UFormField>
  </form>
  <p
    v-else
    class="text-sm text-muted"
  >
    {{ t('none') }}
  </p>
</template>

<i18n lang="yaml">
el:
  tooLong: Είναι πολύ μεγάλο.
  none: Αυτό το έγγραφο δεν έχει δικές του ρυθμίσεις σελίδας.
en:
  tooLong: It's too long.
  none: This document has no page settings of its own.
</i18n>
