<script lang="ts" setup>
const { t } = useStoreI18n('components/Builder/PresenceNotice')
const store = useBuilderEditorStore()
const presence = useBuilderPresenceStore()
const { documentKey } = useBuilderEditorView()
const { documentLabel } = useBuilderLabels()

/** What this editor has open: the page and the section groups around it. */
const documents = computed(() => [documentKey.value, ...store.groups.map(({ key }) => key)])

// A beat now, and another every `BUILDER_PRESENCE_HEARTBEAT_MS`; a beat of its
// own when the documents change, so a page opened is seen at once.
useIntervalFn(() => presence.beat(documents.value), BUILDER_PRESENCE_HEARTBEAT_MS, { immediateCallback: true })
watch(documents, value => presence.beat(value))

// Leaving the editor lets go of the documents at once rather than after a lapse.
useEventListener(window, 'pagehide', () => presence.leave())
onBeforeUnmount(() => {
  void presence.leave()
})

/** The other people on each document, one line per document that has any. */
const lines = computed(() => documents.value.flatMap((key) => {
  const people = presence.others[key] ?? []
  return people.length
    ? [{ key, text: t('line', { names: people.map(({ name }) => name).join(', '), document: documentLabel(key) }, people.length) }]
    : []
}))
</script>

<template>
  <UAlert
    v-if="lines.length"
    role="status"
    icon="i-lucide-users"
    color="info"
    variant="subtle"
    :title="t('title')"
    class="rounded-none"
  >
    <template #description>
      <ul class="list-none">
        <li
          v-for="line in lines"
          :key="line.key"
        >
          {{ line.text }}
        </li>
      </ul>
    </template>
  </UAlert>
</template>

<i18n lang="yaml">
el:
  title: Άλλοι επεξεργάζονται το ίδιο περιεχόμενο
  line: "{names} επεξεργάζεται: {document} | {names} επεξεργάζονται: {document}"
en:
  title: Others are editing the same content
  line: "{names} is editing {document} | {names} are editing {document}"
</i18n>
