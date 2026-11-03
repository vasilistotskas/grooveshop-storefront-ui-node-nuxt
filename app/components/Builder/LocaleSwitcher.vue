<script lang="ts" setup>
import { DEFAULT_LOCALE } from '~~/i18n/locales'

/**
 * The language being edited, for a store that serves more than one: the
 * draft's (every document is written in `DEFAULT_LOCALE`), or another one
 * the store serves, written as its translation. It changes the preview and
 * the settings form together (`useBuilderEditorView().locale`). Each
 * language other than the draft's says how many settings of this page still
 * need translating into it.
 */
const { t } = useStoreI18n('components/Builder/LocaleSwitcher')
const tenantStore = useTenantStore()
const store = useBuilderEditorStore()
const { documentKey, locale, setLocale } = useBuilderEditorView()

/** The draft's language first, then the others the store serves. */
const locales = computed(() => toUiLocales([DEFAULT_LOCALE, ...tenantStore.availableLocales.filter(served => served !== DEFAULT_LOCALE)]))

/** How many settings of this page still need a translation into a language. */
function missingIn(code: string): number {
  const document = store.opened[documentKey.value]
  return document && code !== DEFAULT_LOCALE ? builderMissingTranslations(document.copy, code, builderEditorBlocks) : 0
}

const items = computed(() => locales.value.map(entry => ({
  label: entry.name,
  value: entry.code,
  description: entry.code === DEFAULT_LOCALE ? t('original') : undefined,
  missing: missingIn(entry.code),
})))

function choose(next: unknown): void {
  const found = [DEFAULT_LOCALE, ...tenantStore.availableLocales].find(code => code === next)
  if (found) void setLocale(found)
}
</script>

<template>
  <USelect
    v-if="tenantStore.isMultilingual"
    :model-value="locale"
    :items="items"
    icon="i-lucide-languages"
    :aria-label="t('label')"
    :ui="{ content: 'min-w-56' }"
    class="w-auto"
    @update:model-value="choose"
  >
    <template #item-trailing="{ item }">
      <UBadge
        v-if="item.missing > 0"
        color="warning"
        variant="subtle"
        size="sm"
        :label="t('missing', { count: item.missing }, item.missing)"
      />
    </template>
  </USelect>
</template>

<i18n lang="yaml">
el:
  label: Γλώσσα επεξεργασίας
  original: Η γλώσσα της σελίδας
  missing: "{count} χωρίς μετάφραση | {count} χωρίς μετάφραση"
en:
  label: Language being edited
  original: The page's own language
  missing: "{count} not translated | {count} not translated"
</i18n>
