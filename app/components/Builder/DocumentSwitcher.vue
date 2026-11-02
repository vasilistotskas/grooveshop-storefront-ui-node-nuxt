<script lang="ts" setup>
import type { SelectMenuItem } from '@nuxt/ui'

const { t } = useStoreI18n('components/Builder/DocumentSwitcher')
const { templateLabel } = useBuilderLabels()
const store = useBuilderEditorStore()
const { documentKey, openDocument } = useBuilderEditorView()

/** What the switcher shows for a document: a page type by its name, a page the store made by its address. */
function documentItem(key: string): SelectMenuItem & { value: string } {
  const name = key.slice(key.indexOf(':') + 1)
  return key.startsWith('template:') && isStaticLayoutPageType(name)
    ? { value: key, label: templateLabel(name), icon: 'i-lucide-layout-template' }
    : { value: key, label: pagePath(name), icon: 'i-lucide-file-text' }
}

const items = computed<SelectMenuItem[][]>(() => {
  const templates = store.pages.filter(({ kind }) => kind === 'template').map(({ key }) => documentItem(key))
  const pages = store.pages.filter(({ kind }) => kind === 'page').map(({ key }) => documentItem(key))
  return [
    ...(templates.length ? [[{ type: 'label' as const, label: t('templates') }, ...templates]] : []),
    ...(pages.length ? [[{ type: 'label' as const, label: t('pages') }, ...pages]] : []),
  ]
})

const selected = computed({
  get: () => documentKey.value,
  set: (key: string) => {
    if (key !== documentKey.value) void openDocument(key)
  },
})
</script>

<template>
  <USelectMenu
    v-model="selected"
    :items="items"
    value-key="value"
    color="neutral"
    variant="ghost"
    :search-input="{ placeholder: t('search') }"
    :aria-label="t('label')"
    :ui="{ content: 'min-w-64' }"
  />
</template>

<i18n lang="yaml">
el:
  label: Σελίδα για επεξεργασία
  search: Αναζήτηση σελίδας
  templates: Σελίδες του καταστήματος
  pages: Δικές σας σελίδες
en:
  label: Page to edit
  search: Find a page
  templates: Store pages
  pages: Your pages
</i18n>
