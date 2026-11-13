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
  /** The field's own wording, in place of "Search the shop" (a hero's question). */
  placeholder?: string
  /**
   * `lg` is a hero's field: 50px tall on a phone and 52px from `sm` up, in
   * body-size type, with a «Search» button beside it from `sm` up that opens
   * the same palette. Not for the header (`compact`).
   */
  size?: 'md' | 'lg'
}>(), {
  compact: false,
  placeholder: undefined,
  size: 'md',
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

const label = computed(() => props.placeholder || t('search.placeholder'))
const large = computed(() => !props.compact && props.size === 'lg')
</script>

<template>
  <div
    :class="[
      'flex items-center',
      compact ? 'min-w-0' : 'w-full',
      large && 'gap-2',
    ]"
  >
    <UButton
      v-if="compact"
      icon="i-lucide-search"
      color="neutral"
      variant="ghost"
      square
      class="
        max-sm:min-h-11 max-sm:min-w-11
        lg:hidden
      "
      :aria-label="label"
      :aria-keyshortcuts="owner ? KEY_SHORTCUTS : undefined"
      @click="openSearchModal"
    />

    <UButton
      color="neutral"
      :variant="large ? 'solid' : 'outline'"
      :class="[
        compact ? `
          hidden h-10.5 w-75 min-w-36
          lg:flex
        ` : large ? `
          h-12.5 min-w-0 flex-1 bg-default ps-3.5
          hover:bg-default
          sm:h-13 sm:ps-4
        ` : `
          h-11 w-full
          sm:h-10.5
        `,
        // A section's field is a target of at least 44px on a phone.
        large
          ? 'justify-start gap-2.5 text-base font-normal text-muted'
          : 'justify-start gap-2 px-3.5 text-sm font-medium text-muted',
      ]"
      :aria-keyshortcuts="owner ? KEY_SHORTCUTS : undefined"
      @click="openSearchModal"
    >
      <UIcon
        name="i-lucide-search"
        :class="large ? 'size-5 shrink-0' : 'size-4 shrink-0'"
      />
      <span class="flex-1 truncate text-start">
        {{ label }}
      </span>
      <span
        v-if="owner && !large"
        class="flex shrink-0 items-center gap-0.5"
      >
        <UKbd value="meta" />
        <UKbd value="K" />
      </span>
    </UButton>

    <!-- The field's own button: it opens the same palette, as the field
         does. A phone has no room beside a 50px field for it. -->
    <UButton
      v-if="large"
      :label="t('search.submit')"
      color="secondary"
      size="xl"
      class="
        h-13 shrink-0 px-5.5 text-base font-semibold
        max-sm:hidden
      "
      @click="openSearchModal"
    />

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
    submit: Αναζήτηση
en:
  search:
    placeholder: Search the shop
    submit: Search
</i18n>
