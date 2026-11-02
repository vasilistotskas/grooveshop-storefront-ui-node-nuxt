<script lang="ts" setup>
const props = defineProps<{
  documentKey: string
  nodeId: string
}>()

const { t } = useStoreI18n('components/Builder/SettingsForm')
const store = useBuilderEditorStore()
const autosave = useBuilderAutosaveStore()

const node = computed(() => {
  const document = store.opened[props.documentKey]
  return document ? findBuilderNode(document.copy.draft, props.nodeId) : undefined
})
const definition = computed(() => node.value ? builderEditorBlocks.get(builderBlockType(node.value)) : undefined)
const fields = computed(() => definition.value ? builderSettingsFields(definition.value) : [])

/**
 * What is wrong with the settings, by field path: the block's own schema,
 * checked here as the merchant types (the schema Django checks with), and
 * Django's refusal of the last save, by the pointer it named.
 */
const errors = computed(() => {
  const byField = new Map<string, string>()
  const add = (path: string, message: string) => {
    const field = fieldForSettingPath(fields.value, path)
    if (field && !byField.has(field.path)) byField.set(field.path, message)
  }
  const parsed = node.value && definition.value ? definition.value.schema.safeParse(node.value.settings) : undefined
  for (const issue of parsed?.error?.issues ?? []) add(issue.path.map(String).join('.'), t(`issue.${issueKind(issue.code)}`))
  for (const problem of autosave.saves[props.documentKey]?.problems ?? []) {
    const path = builderProblemSettingPath(problem.path, props.nodeId)
    if (path) add(path, problem.message)
  }
  return byField
})

/** The kinds of schema issue the form names; anything else reads as "not valid". */
function issueKind(code: string): 'tooLong' | 'tooShort' | 'missing' | 'invalid' {
  switch (code) {
    case 'too_big': return 'tooLong'
    case 'too_small': return 'tooShort'
    case 'invalid_type': return 'missing'
    default: return 'invalid'
  }
}

function update(path: string, value: unknown): void {
  const document = store.opened[props.documentKey]
  if (!document) return
  store.change(props.documentKey, setNodeSetting(document.copy, props.nodeId, path, value), {
    coalesce: `${props.nodeId}/${path}`,
  })
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
      v-if="fields.length === 0"
      class="text-sm text-muted"
    >
      {{ t('noSettings') }}
    </p>
    <BuilderSettingField
      v-for="field in fields"
      :key="field.path"
      :field="field"
      :settings="node.settings"
      :errors="errors"
      :disabled="!store.canEdit"
      @update="update"
    />
  </form>
</template>

<i18n lang="yaml">
el:
  noSettings: Αυτή η ενότητα δεν έχει ρυθμίσεις.
  issue:
    tooLong: Είναι πολύ μεγάλο.
    tooShort: Είναι πολύ μικρό ή κενό.
    missing: Χρειάζεται τιμή.
    invalid: Δεν είναι έγκυρο.
en:
  noSettings: This section has no settings.
  issue:
    tooLong: It's too long.
    tooShort: It's too short, or empty.
    missing: It needs a value.
    invalid: It isn't valid.
</i18n>
