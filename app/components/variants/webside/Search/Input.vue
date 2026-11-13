<script lang="ts" setup>
/**
 * Webside's search field and the palette it opens (`WebsideSearchModal`):
 * the header's, and through the `search_field` part every shared section's
 * (the hero's, the search band's), so the page has one search whichever
 * field a shopper uses.
 *
 * `compact` is the header's form: an icon on a phone and a tablet, the field
 * with its key hint from there up. Without it the field fills its container,
 * a section's: `lg` is a hero's (50px tall on a phone and 52px from `sm` up,
 * body-size type, a «Search» button beside it from `sm` up that opens the
 * same palette). The keyboard shortcuts belong to ONE field of the page
 * (`useSearchShortcut`): the header's when it is there, else the first
 * section field, and only that field shows the key hint.
 */
const props = withDefaults(defineProps<{
  compact?: boolean
  /** The field's own wording, a section's setting, in place of the design's. */
  placeholder?: string
  size?: 'md' | 'lg'
}>(), {
  compact: false,
  placeholder: undefined,
  size: 'md',
})

const { t } = useStoreI18n('components/variants/webside/Search/Input')
const route = useRoute()
const { isMobileOrTablet } = useDevice()
// The field names what the palette searches: posts too only while the store
// runs its blog (the palette's Blog tab follows the same switch).
const blogEnabled = useStoreFeature('blog')

const searchQuery = ref(
  Array.isArray(route.query.query)
    ? route.query.query[0] ?? ''
    : route.query.query ?? '',
)
const placeholder = computed(() => props.placeholder || t(blogEnabled.value ? 'search.placeholder' : 'search.placeholder_products'))
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
    v-if="compact"
    class="
      relative flex items-center
      md:w-full
    "
  >
    <UButton
      :label="isMobileOrTablet ? undefined : placeholder"
      color="neutral"
      :variant="isMobileOrTablet ? 'ghost' : 'outline'"
      size="md"
      block
      :ui="{
        base: `
          p-0 text-primary-800
          hover:text-primary-950
          md:px-2.5 md:py-1.5
          dark:text-primary-200
          dark:hover:text-primary-50
        `,
        label: 'font-normal',
      }"
      class="
        relative
        max-lg:after:absolute max-lg:after:-inset-2.5
        md:max-w-md
      "
      :aria-label="isMobileOrTablet ? placeholder : undefined"
      @click="openSearchModal"
    >
      <template #default>
        <div
          v-if="!isMobileOrTablet" class="
            flex w-full items-center justify-between
          "
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-magnifying-glass"
              class="size-5"
            />
            <span>
              {{ placeholder }}
            </span>
          </div>
          <div
            class="
              hidden items-center gap-1
              sm:flex
            "
          >
            <UKbd size="sm">
              Ctrl
            </UKbd>
            <UKbd size="sm">
              K
            </UKbd>
          </div>
        </div>
        <UIcon
          v-else
          name="i-heroicons-magnifying-glass"
          class="
            size-6
            md:size-5
          "
        />
      </template>
    </UButton>

    <LazyWebsideSearchModal
      v-if="modalMounted"
      v-model:open="isModalOpen"
      v-model:query="searchQuery"
    />
  </div>

  <!-- A section's field: always the field, never the header's icon, the
       same on every device. A hero's (`lg`) is white on any band, in
       body-size type, with its own button beside it from `sm` up; the field
       is the one control a keyboard or a screen reader meets, so the button
       takes no tab stop and is hidden from assistive tech. -->
  <div
    v-else
    class="flex w-full items-center"
    :class="size === 'lg' && 'gap-2'"
  >
    <UButton
      color="neutral"
      :variant="size === 'lg' ? 'solid' : 'outline'"
      class="min-w-0 flex-1 justify-start font-normal text-muted"
      :class="size === 'lg' ? `
        h-12.5 gap-2.5 bg-default ps-3.5 text-base
        hover:bg-default
        sm:h-13 sm:ps-4
      ` : `
        h-11 gap-2 px-3.5 text-sm
        sm:h-10.5
      `"
      :aria-keyshortcuts="owner ? KEY_SHORTCUTS : undefined"
      @click="openSearchModal"
    >
      <UIcon
        name="i-heroicons-magnifying-glass"
        class="shrink-0"
        :class="size === 'lg' ? 'size-5' : 'size-4'"
      />
      <span class="flex-1 truncate text-start">
        {{ placeholder }}
      </span>
      <span
        v-if="owner"
        class="flex shrink-0 items-center gap-0.5"
      >
        <UKbd value="meta" />
        <UKbd value="K" />
      </span>
    </UButton>
    <UButton
      v-if="size === 'lg'"
      :label="t('search.submit')"
      color="secondary"
      size="xl"
      tabindex="-1"
      aria-hidden="true"
      class="
        h-13 shrink-0 px-5.5 text-base font-semibold
        max-sm:hidden
      "
      @click="openSearchModal"
    />

    <LazyWebsideSearchModal
      v-if="modalMounted"
      v-model:open="isModalOpen"
      v-model:query="searchQuery"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  search:
    placeholder: Αναζήτηση άρθρων και προϊόντων
    placeholder_products: Αναζήτηση προϊόντων
    submit: Αναζήτηση
en:
  search:
    placeholder: Search articles and products
    placeholder_products: Search products
    submit: Search
</i18n>
