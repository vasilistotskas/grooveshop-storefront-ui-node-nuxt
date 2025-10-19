<script lang="ts" setup>
const { t } = useI18n()
const route = useRoute()
const { isMobileOrTablet } = useDevice()

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
  <Component
    :is="isMobileOrTablet ? 'li' : 'div'"
    class="
      relative flex items-center
      md:w-full
    "
  >
    <UButton
      :label="isMobileOrTablet ? undefined : t('search.placeholder')"
      color="neutral"
      :variant="isMobileOrTablet ? 'ghost' : 'outline'"
      size="md"
      block
      :ui="{
        base: 'p-0 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 md:px-2.5 md:py-1.5',
        label: 'font-normal',
      }"
      class="md:max-w-md"
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
              name="i-lucide-search"
              class="size-5"
            />
            <span>
              {{ t('search.placeholder') }}
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
          name="i-lucide-search"
          class="
            size-6
            md:size-5
          "
        />
      </template>
    </UButton>

    <LazySearchModal
      v-model:open="isModalOpen"
      v-model:query="searchQuery"
    />
  </Component>
</template>

<i18n lang="yaml">
el:
  search:
    placeholder: Αναζήτηση...
</i18n>
