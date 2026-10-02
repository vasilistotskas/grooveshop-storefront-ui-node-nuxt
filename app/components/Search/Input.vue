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
 */
withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const { t } = useI18n()
const route = useRoute()

const searchQuery = ref(
  Array.isArray(route.query.query)
    ? route.query.query[0] ?? ''
    : route.query.query ?? '',
)
const isModalOpen = ref(false)

function openSearchModal() {
  isModalOpen.value = true
}

defineShortcuts({
  'meta_k': {
    handler: () => {
      openSearchModal()
    },
  },
  '/': {
    usingInput: false,
    handler: () => {
      openSearchModal()
    },
  },
})
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
      icon="i-heroicons-magnifying-glass"
      color="neutral"
      variant="ghost"
      square
      class="lg:hidden"
      :aria-label="t('search.placeholder')"
      aria-keyshortcuts="Control+K Meta+K /"
      @click="openSearchModal"
    />

    <UButton
      color="neutral"
      variant="outline"
      :class="[
        'h-10.5 justify-start gap-2 px-3.5 text-sm font-medium text-muted',
        compact ? 'hidden w-75 min-w-36 lg:flex' : 'w-full',
      ]"
      aria-keyshortcuts="Control+K Meta+K /"
      @click="openSearchModal"
    >
      <UIcon
        name="i-heroicons-magnifying-glass"
        class="size-4 shrink-0"
      />
      <span class="flex-1 truncate text-start">
        {{ t('search.placeholder') }}
      </span>
      <span class="flex shrink-0 items-center gap-0.5">
        <UKbd value="meta" />
        <UKbd value="K" />
      </span>
    </UButton>

    <LazySearchModal
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
