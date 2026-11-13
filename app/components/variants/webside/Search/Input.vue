<script lang="ts" setup>
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
const placeholder = computed(() => t(blogEnabled.value ? 'search.placeholder' : 'search.placeholder_products'))
const isModalOpen = ref(false)
// The palette (and the search library behind it) loads the first time it opens.
const modalMounted = useMountOnFirstOpen(isModalOpen)

function openSearchModal() {
  isModalOpen.value = true
}

// Webside's field is its header's: it owns the shortcut whenever it is on
// the page, and a section's field on the same page answers none.
useSearchShortcut(true, openSearchModal)
</script>

<template>
  <div
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
</template>

<i18n lang="yaml">
el:
  search:
    placeholder: Αναζήτηση άρθρων και προϊόντων
    placeholder_products: Αναζήτηση προϊόντων
en:
  search:
    placeholder: Search articles and products
    placeholder_products: Search products
</i18n>
