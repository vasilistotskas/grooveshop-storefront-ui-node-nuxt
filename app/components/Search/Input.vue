<script lang="ts" setup>
const { t } = useI18n()
const route = useRoute()

// Search state
const searchQuery = ref(
  Array.isArray(route.query.query)
    ? route.query.query[0] ?? ''
    : route.query.query ?? '',
)
const isModalOpen = ref(false)

// Open search modal
function openSearchModal() {
  isModalOpen.value = true
}

// Keyboard shortcuts to open search
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
  <div class="relative w-full">
    <UButton
      :label="t('search.placeholder')"
      color="neutral"
      variant="outline"
      size="md"
      block
      :ui="{
        base: 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
        label: 'font-normal',
      }"
      class="max-w-md"
      @click="openSearchModal"
    >
      <template #default>
        <div class="flex w-full items-center justify-between">
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
      </template>
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
    placeholder: Αναζήτηση...
</i18n>
