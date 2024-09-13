<script setup lang="ts">
import type { SearchBlogPost, SearchProduct, SearchResponse, SearchResult } from '~/types/search'
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

const attrs = useAttrs()

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

function showMoreSectionResults(section: SearchResult<SearchProduct | SearchBlogPost>, limit: number): boolean {
  return section.estimatedTotalHits > Number(limit)
}

function sectionExtraResults(section: SearchResult<SearchProduct | SearchBlogPost>, limit: number, offset: number): number {
  const remainingResults = section.estimatedTotalHits - offset - limit
  return Math.max(remainingResults, 0)
}

function onLoadMore(section: SearchResult<SearchProduct | SearchBlogPost>, lim: number, off: number): void {
  console.log('onLoadMore', section, lim, off)
  emit('load-more', { lim, off })
}

await preloadComponents('SearchResultItem')
</script>

<template>
  <div
    v-if="(searchBarFocused && hasResults) || (hasResults && status === 'pending')"
    v-bind="attrs"
    ref="autocomplete"
    class="shadow-4xl flex w-full flex-col gap-4 overflow-auto"
  >
    <Transition>
      <div
        v-if="allResults && hasResults && query.length !== 0" class="grid gap-4"
      >
        <template
          v-for="([key, section]) in Object.entries(allResults)" :key="key"
        >
          <div
            v-if="section && section.results && section.results.length > 0" class="
              flex flex-col gap-2
            "
          >
            <div class="flex items-center">
              <span
                class="
                  text-md me-4 flex-shrink text-primary-950

                  dark:text-primary-50
                "
              >
                {{ $t(`common.sections.${key}`) }}
              </span>
              <div
                class="
                  flex-grow border-t border-primary-300

                  dark:border-primary-500
                "
              />
            </div>

            <ul v-for="result in section?.results" :key="result.id">
              <SearchResultItem
                :highlighted="highlighted ? highlighted === String(result.id) : false"
                :item="result"
                @click="searchBarFocused = false"
                @mousedown="keepFocus = true"
                @mouseover="highlighted = undefined"
              />
            </ul>

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
                {{ $t("common.results_left", sectionExtraResults(section, Number(limit), Number(offset))) }}
              </UButton>
              <span class="text-sm text-primary-400">
                {{ section.estimatedTotalHits > Number(limit) ? $t("common.approx_results", section.estimatedTotalHits) : $t("results", section.estimatedTotalHits) }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
