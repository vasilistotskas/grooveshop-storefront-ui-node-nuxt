<script lang="ts" setup>
import type { AsyncDataRequestStatus } from '#app/composables/asyncData'

const props = defineProps({
  query: {
    type: String,
    required: true,
  },
  limit: {
    type: Number,
    required: true,
  },
  offset: {
    type: Number,
    required: true,
  },
  allResults: {
    type: Object as PropType<SearchResponse | undefined | null>,
    default: undefined,
  },
  status: {
    type: String as PropType<AsyncDataRequestStatus>,
    required: false,
    default: 'idle',
  },
  hasResults: {
    type: Boolean,
    required: true,
  },
  loadMore: {
    type: Boolean,
    required: false,
    default: true,
  },
})

const { query, limit, offset, allResults, status, hasResults } = toRefs(props)

const emit = defineEmits<{
  (
    e: 'load-more',
    { lim, off }: { lim: number, off: number },
  ): void
}>()

const searchBarFocused = defineModel<boolean>('searchBarFocused', {
  required: false,
  default: true,
})

const keepFocus = defineModel<boolean>('keepFocus', {
  required: true,
})

const highlighted = defineModel<string | undefined>('highlighted', {
  required: true,
})

const attrs = useAttrs()
const { $i18n } = useNuxtApp()

function showMoreSectionResults(section: ProductMeiliSearchResponse | BlogPostMeiliSearchResponse, limit: number): boolean {
  return section.estimatedTotalHits > Number(limit)
}

function sectionExtraResults(section: ProductMeiliSearchResponse | BlogPostMeiliSearchResponse, limit: number, offset: number): number {
  const remainingResults = section.estimatedTotalHits - offset - limit
  return Math.max(remainingResults, 0)
}

function onLoadMore(section: ProductMeiliSearchResponse | BlogPostMeiliSearchResponse, lim: number, off: number): void {
  emit('load-more', { lim, off })
}
</script>

<template>
  <div
    v-if="(searchBarFocused && hasResults) || (hasResults && status === 'pending')"
    v-bind="attrs"
    ref="autocomplete"
    class="flex w-full flex-col gap-4 overflow-auto"
  >
    <div
      v-if="allResults && hasResults && query.length !== 0"
      class="grid gap-4"
    >
      <template
        v-for="([key, section]) in Object.entries(allResults)"
        :key="key"
      >
        <div
          v-if="section && section.results && section.results.length > 0"
          class="flex flex-col gap-2"
        >
          <div class="flex items-center">
            <span
              class="
                me-4 shrink text-base text-primary-950
                dark:text-primary-50
              "
            >
              {{ $i18n.t(`sections.${key}`) }}
            </span>
            <div
              class="
                grow border-t border-primary-300
                dark:border-primary-500
              "
            />
          </div>

          <template v-if="status === 'success'">
            <ul
              v-for="result in section?.results"
              :key="result.id"
            >
              <SearchResultItem
                :highlighted="highlighted ? highlighted === String(result.id) : false"
                :item="result"
                @click="searchBarFocused = false"
                @mousedown="keepFocus = true"
                @mouseover="highlighted = undefined"
              />
            </ul>
          </template>

          <div
            v-if="loadMore && showMoreSectionResults(section, Number(limit))"
            class="-mt-2"
          >
            <UButton
              v-if="sectionExtraResults(section, Number(limit), Number(offset)) > 0"
              variant="link"
              size="sm"
              @mousedown="keepFocus = true"
              @click="onLoadMore(section, Number(limit), Number(offset))"
            >
              {{ $i18n.t("results_left", sectionExtraResults(section, Number(limit), Number(offset))) }}
            </UButton>
            <span class="text-sm text-primary-400">
              {{ section.estimatedTotalHits > Number(limit) ? $i18n.t("approx_results", section.estimatedTotalHits) : $i18n.t("results", section.estimatedTotalHits) }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
