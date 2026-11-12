<script lang="ts" setup>
/**
 * The search field that opens the search palette.
 *
 * `compact` is the header's form: an icon button on a phone and a pill
 * from `lg` up (300px, giving way to 144px when the header row runs
 * short — the placeholder truncates), switched by CSS rather than by sniffing the user agent,
 * so the cached anonymous render is the same for every device and
 * neither control shifts when the page hydrates. Without it the field
 * fills its container — the search-bar section.
 *
 * The visible field's accessible name is its own text plus the key
 * hint; only the icon-only button needs an `aria-label` (WCAG 2.5.3
 * Label in Name — Lighthouse `label-content-name-mismatch`).
 *
 * The keyboard shortcuts belong to ONE field of the page
 * (`useSearchShortcut`): the header's (`compact`) when there is one, else
 * the first section field. Only that field shows the key hint and states
 * `aria-keyshortcuts`.
 */
const props = withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const { t } = useStoreI18n('components/Search/Input')
const route = useRoute()

const searchQuery = ref(
  Array.isArray(route.query.query)
    ? route.query.query[0] ?? ''
    : route.query.query ?? '',
)
const isModalOpen = ref(false)
// The palette (and the search library behind it) loads the first time it opens.
const modalMounted = useMountOnFirstOpen(isModalOpen)

function openSearchModal() {
  isModalOpen.value = true
}

const { owner } = useSearchShortcut(props.compact, openSearchModal)

const KEY_SHORTCUTS = 'Control+K Meta+K /'
</script>

<template>
  <div
    :class="[
      'flex items-center',
      compact ? 'min-w-0' : 'w-full',
    ]"
  >
    <UButton
      v-if="compact"
      icon="i-lucide-search"
      color="neutral"
      variant="ghost"
      square
      class="lg:hidden"
      :aria-label="t('search.placeholder')"
      :aria-keyshortcuts="owner ? KEY_SHORTCUTS : undefined"
      @click="openSearchModal"
    />

    <UButton
      color="neutral"
      variant="outline"
      :class="[
        'h-10.5 justify-start gap-2 px-3.5 text-sm font-medium text-muted',
        compact ? `
          hidden w-75 min-w-36
          lg:flex
        ` : 'w-full',
      ]"
      :aria-keyshortcuts="owner ? KEY_SHORTCUTS : undefined"
      @click="openSearchModal"
    >
      <UIcon
        name="i-lucide-search"
        class="size-4 shrink-0"
      />
      <span class="flex-1 truncate text-start">
        {{ t('search.placeholder') }}
      </span>
      <span
        v-if="owner"
        class="flex shrink-0 items-center gap-0.5"
      >
        <UKbd value="meta" />
        <UKbd value="K" />
      </span>
    </UButton>

    <LazySearchModal
      v-if="modalMounted"
      v-model:open="isModalOpen"
      v-model:query="searchQuery"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  search:
    placeholder: Αναζήτηση στο κατάστημα
en:
  search:
    placeholder: Search the shop
</i18n>
