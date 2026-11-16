<script lang="ts" setup>
import { DEFAULT_LOCALE } from '~~/i18n/locales'

const props = defineProps<{
  documentKey: string
  nodeId: string
}>()

const { t } = useStoreI18n('components/Builder/SettingsForm')
const store = useBuilderEditorStore()
const autosave = useBuilderAutosaveStore()
const tenantStore = useTenantStore()
const { locale } = useBuilderEditorView()
const { settingLabel } = useBuilderLabels()

const node = computed(() => {
  const document = store.opened[props.documentKey]
  return document ? findBuilderNode(document.copy.draft, props.nodeId) : undefined
})
const definition = computed(() => node.value ? builderEditorBlocks.get(builderBlockType(node.value)) : undefined)
/** Every setting of the block, whichever the store's design draws. */
const allFields = computed(() => definition.value ? builderSettingsFields(definition.value) : [])
/** The settings the store's design draws: a control that changes nothing on its pages is not offered. */
const fields = computed(() => definition.value ? builderSettingsFields(definition.value, tenantStore.schemaName) : [])

/** The node's translations into the language being edited, when it is not the draft's. */
const translations = computed(() => {
  const document = store.opened[props.documentKey]
  return locale.value === DEFAULT_LOCALE || !document ? undefined : document.copy.i18n[locale.value]?.[props.nodeId] ?? {}
})

/** What the fields read while a language other than the draft's is edited (`BuilderSettingsTranslation`). */
const translation = computed<BuilderSettingsTranslation | undefined>(() => node.value && definition.value && translations.value
  ? { fallback: node.value.settings, translatable: new Set(definition.value.translatable) }
  : undefined)

/** The values the fields show: the draft's, or the translations as settings (each at its own place). */
const values = computed(() => translations.value ? builderTranslatedSettings({}, translations.value) : node.value?.settings ?? {})

/**
 * What is wrong with the settings, by field path: the block's own schema,
 * checked here as the merchant types (the schema Django checks with), and
 * Django's refusal of the last save, by the pointer it named.
 */
const errors = computed(() => {
  const byField = new Map<string, string>()
  const add = (path: string, message: string) => {
    const field = fieldForSettingPath(allFields.value, path)
    if (field && !byField.has(field.path)) byField.set(field.path, message)
  }
  // A language is checked as it reads: the draft with its translations in place.
  const read = node.value ? builderTranslatedSettings(node.value.settings, translations.value) : undefined
  const parsed = read && definition.value ? definition.value.schema.safeParse(read) : undefined
  for (const issue of parsed?.error?.issues ?? []) add(issue.path.map(String).join('.'), t(`issue.${issueKind(issue.code)}`))
  for (const problem of autosave.saves[props.documentKey]?.problems ?? []) {
    const path = builderProblemSettingPath(problem.path, props.nodeId, translations.value ? locale.value : undefined)
    if (path) add(path, problem.message)
  }
  return byField
})

/**
 * The settings the store's design does not draw that still hold a value, or
 * have a problem: one written before the design took the block over, or in
 * another design. Django checks every setting (a link's target must exist to
 * publish), so each stays reachable, apart from the rest, to be cleared. One
 * that holds nothing stays out of the form.
 */
const undrawn = computed(() => {
  const drawn = new Set(fields.value.map(field => field.path))
  const settings = node.value?.settings ?? {}
  return allFields.value.filter(field => !drawn.has(field.path)
    && (settingAt(settings, field.path) !== undefined || settingAt(values.value, field.path) !== undefined || errors.value.has(field.path)))
})
/** Whether a setting the design does not draw has a problem, which opens their group. */
const undrawnProblem = computed(() => undrawn.value.some(field => errors.value.has(field.path)))

/** The kinds of schema issue the form names; anything else reads as "not valid". */
function issueKind(code: string): 'tooLong' | 'tooShort' | 'missing' | 'invalid' {
  switch (code) {
    case 'too_big': return 'tooLong'
    case 'too_small': return 'tooShort'
    case 'invalid_type': return 'missing'
    default: return 'invalid'
  }
}

/** A setting changed: in the draft, or as a translation into the language being edited. */
function update(path: string, value: unknown): void {
  const document = store.opened[props.documentKey]
  if (!document) return
  // TRANSITIONAL (P15 stage 2): an image setting that replaces an old URL takes the URL (and its alt text) out with it.
  const replaced = !translations.value && definition.value ? builderLegacySettingsReplacedBy(definition.value, path) : []
  const next = translations.value
    ? setNodeTranslation(document.copy, locale.value, props.nodeId, `/${path.split('.').join('/')}`, value)
    : replaced.reduce((copy, old) => setNodeSetting(copy, props.nodeId, old, undefined), setNodeSetting(document.copy, props.nodeId, path, value))
  store.change(props.documentKey, next, { coalesce: `${locale.value}/${props.nodeId}/${path}` })
}
</script>

<template>
  <form
    v-if="node && definition"
    class="flex flex-col gap-4"
    novalidate
    @submit.prevent
  >
    <p
      v-if="fields.length === 0 && undrawn.length === 0"
      class="text-sm text-muted"
    >
      {{ t('noSettings') }}
    </p>
    <template v-if="definition">
      <BuilderSettingField
        v-for="field in fields"
        :key="field.path"
        :block-type="definition.type"
        :field="field"
        :settings="values"
        :errors="errors"
        :disabled="!store.canEdit"
        :translation="translation"
        @update="update"
      />
      <details
        v-if="undrawn.length"
        :open="undrawnProblem"
        class="rounded-md border border-default"
      >
        <summary class="cursor-pointer px-3 py-2 text-sm font-medium">
          {{ t('undrawn.title') }}
        </summary>
        <div class="flex flex-col gap-4 px-3 pb-3">
          <p class="text-sm text-muted">
            {{ t('undrawn.help') }}
          </p>
          <div
            v-for="field in undrawn"
            :key="field.path"
            class="flex flex-col items-start gap-2"
          >
            <BuilderSettingField
              class="w-full"
              :block-type="definition.type"
              :field="field"
              :settings="values"
              :errors="errors"
              :disabled="!store.canEdit"
              :translation="translation"
              @update="update"
            />
            <UButton
              v-if="store.canEdit && !translation"
              type="button"
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-lucide-eraser"
              :label="t('undrawn.clear')"
              :aria-label="t('undrawn.clearNamed', { name: settingLabel(field.path) })"
              @click="() => update(field.path, undefined)"
            />
          </div>
        </div>
      </details>
    </template>
  </form>
</template>

<i18n lang="yaml">
el:
  noSettings: Αυτή η ενότητα δεν έχει ρυθμίσεις.
  undrawn:
    title: Δεν εμφανίζονται στο σχέδιο του καταστήματος
    help: Το σχέδιο αυτού του καταστήματος δεν δείχνει αυτές τις ρυθμίσεις, αλλά έχουν ακόμη τιμή, που ελέγχεται κατά τη δημοσίευση. Διαγράψτε όσες δεν χρειάζεστε.
    clear: Διαγραφή
    clearNamed: Διαγραφή της ρύθμισης {name}
  issue:
    tooLong: Είναι πολύ μεγάλο.
    tooShort: Είναι πολύ μικρό ή κενό.
    missing: Χρειάζεται τιμή.
    invalid: Δεν είναι έγκυρο.
en:
  noSettings: This section has no settings.
  undrawn:
    title: Not drawn by this store's design
    help: This store's design does not show these settings, but they still hold a value, which is checked when you publish. Clear the ones you do not need.
    clear: Clear
    clearNamed: Clear the setting {name}
  issue:
    tooLong: It's too long.
    tooShort: It's too short, or empty.
    missing: It needs a value.
    invalid: It isn't valid.
</i18n>
