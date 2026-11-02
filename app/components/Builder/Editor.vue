<script lang="ts" setup>
const props = defineProps<{
  session: BuilderSessionInfo
}>()

const emit = defineEmits<{
  signOut: []
}>()

const { t } = useStoreI18n('components/Builder/Editor')

const store = useBuilderEditorStore()
const { documentKey, openDocument } = useBuilderEditorView()

/** The outline as a drawer, below the width that fits it beside the preview. */
const outlineOpen = ref(false)

watch(() => props.session.staff.role, (role) => {
  store.role = role
}, { immediate: true })
watch(documentKey, key => store.open(key), { immediate: true })
</script>

<template>
  <BuilderTopBar
    :session="session"
    @sign-out="emit('signOut')"
    @open-outline="() => { outlineOpen = true }"
  />

  <UDashboardGroup
    unit="px"
    :persistent="false"
    :ui="{ base: 'relative flex min-h-0 flex-1 overflow-hidden' }"
  >
    <UDashboardSidebar
      id="builder-outline"
      v-model:open="outlineOpen"
      resizable
      :toggle="false"
      :min-size="BUILDER_OUTLINE_PANE.min"
      :default-size="BUILDER_OUTLINE_PANE.default"
      :max-size="BUILDER_OUTLINE_PANE.max"
      :ui="{ header: 'h-12 justify-between', body: 'px-2 py-3' }"
    >
      <template #header>
        <h2 class="text-sm font-semibold">
          {{ t('outline.title') }}
        </h2>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          class="lg:hidden"
          :aria-label="t('outline.close')"
          @click="() => { outlineOpen = false }"
        />
      </template>
      <BuilderOutline v-if="store.status === 'ready'" />
    </UDashboardSidebar>

    <UDashboardPanel id="builder-preview">
      <template #body>
        <div
          class="flex flex-1 items-center justify-center"
          role="status"
        >
          <UEmpty
            v-if="store.status === 'idle' || store.status === 'loading'"
            loading
            variant="naked"
            :title="t('loading')"
          />
          <UEmpty
            v-else-if="store.status === 'notFound'"
            icon="i-lucide-file-question"
            :title="t('notFound.title')"
            :description="t('notFound.description')"
            :actions="documentKey === BUILDER_EDITOR_HOME_DOCUMENT
              ? []
              : [{ label: t('notFound.home'), color: 'neutral', variant: 'outline', onClick: () => openDocument(BUILDER_EDITOR_HOME_DOCUMENT) }]"
          />
          <UEmpty
            v-else-if="store.status === 'unreadable'"
            icon="i-lucide-file-warning"
            :title="t('unreadable.title')"
            :description="t('unreadable.description')"
          />
          <UEmpty
            v-else-if="store.status === 'error'"
            icon="i-lucide-cloud-off"
            :title="t('error.title')"
            :description="t('error.description')"
            :actions="[{ label: t('error.retry'), color: 'neutral', variant: 'outline', onClick: () => store.open(documentKey) }]"
          />
          <UEmpty
            v-else
            icon="i-lucide-monitor"
            variant="naked"
            :title="t('preview.title')"
          />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<i18n lang="yaml">
el:
  outline:
    title: Δομή σελίδας
    close: Κλείσιμο της δομής
  loading: Άνοιγμα της σελίδας…
  notFound:
    title: Η σελίδα δεν βρέθηκε
    description: Το κατάστημα δεν έχει αυτή τη σελίδα. Μπορεί να διαγράφηκε.
    home: Άνοιγμα της αρχικής σελίδας
  unreadable:
    title: Η σελίδα δεν ανοίγει
    description: Γράφτηκε σε μορφή που αυτή η έκδοση του επεξεργαστή δεν διαβάζει. Δεν αλλάξαμε τίποτα σε αυτήν.
  error:
    title: Η σελίδα δεν φορτώθηκε
    description: Δεν ήταν δυνατή η σύνδεση με το κατάστημα.
    retry: Δοκιμάστε ξανά
  preview:
    title: Η ζωντανή προβολή έρχεται σύντομα
en:
  outline:
    title: Page outline
    close: Close the outline
  loading: Opening the page…
  notFound:
    title: Page not found
    description: The store has no such page. It may have been deleted.
    home: Open the home page
  unreadable:
    title: This page can't be opened
    description: It was written in a format this version of the editor can't read. Nothing in it was changed.
  error:
    title: The page didn't load
    description: The store couldn't be reached.
    retry: Try again
  preview:
    title: The live preview is coming soon
</i18n>
