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
  <div
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
        base: 'p-0 text-primary-800 dark:text-primary-200 hover:text-primary-950 dark:hover:text-primary-50 md:px-2.5 md:py-1.5',
        label: 'font-normal',
      }"
      class="md:max-w-md"
      :aria-label="t('search.placeholder')"
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
          name="i-heroicons-magnifying-glass"
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
  </div>
</template>

<i18n lang="yaml">
el:
  search:
    placeholder: Αναζήτηση...
</i18n>
