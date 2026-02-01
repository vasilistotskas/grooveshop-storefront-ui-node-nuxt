<script lang="ts" setup>
/**
 * FederatedSearchBar Component
 *
 * A search bar component that uses federated search to query multiple content types
 * (products and blog posts) simultaneously using the useInstantSearch composable.
 *
 * Features:
 * - Real-time search with 150ms debounce
 * - Loading indicator during search
 * - Content type badges for results
 * - Ranking scores display
 * - Formatted highlights from Meilisearch
 * - Responsive design
 *
 * Validates Requirements: 5.4, 5.5
 */

const props = withDefaults(
  defineProps<{
    /** Language code for filtering results */
    languageCode?: string
    /** Maximum number of results to display */
    limit?: number
    /** Placeholder text for the search input */
    placeholder?: string
  }>(),
  {
    languageCode: 'en',
    limit: 20,
    placeholder: 'Search products and articles...',
  },
)

const { t, locale } = useI18n()

// Use the instant search composable with federated endpoint
const {
  searchQuery,
  results,
  isSearching,
  estimatedTotalHits,
  search,
  clear,
} = useInstantSearch({
  endpoint: 'federated',
  languageCode: props.languageCode || locale.value,
  limit: props.limit,
  debounceMs: 150,
})

// Handle input changes
const handleInput = () => {
  search(searchQuery.value)
}

// Handle clear button
const handleClear = () => {
  clear()
}

// Get content type badge configuration
const getContentTypeBadge = (contentType: string) => {
  if (contentType === 'product') {
    return {
      label: t('search.content_types.product'),
      color: 'primary' as const,
      icon: 'i-heroicons-shopping-bag',
    }
  }
  else if (contentType === 'blog_post') {
    return {
      label: t('search.content_types.blog_post'),
      color: 'secondary' as const,
      icon: 'i-heroicons-document-text',
    }
  }
  return {
    label: contentType,
    color: 'neutral' as const,
    icon: 'i-heroicons-document',
  }
}

// Get display title from result
const getDisplayTitle = (result: any) => {
  if (result._formatted) {
    return result._formatted.name || result._formatted.title || result.name || result.title || 'Untitled'
  }
  return result.name || result.title || 'Untitled'
}

// Get display description from result
const getDisplayDescription = (result: any) => {
  if (result._formatted) {
    return result._formatted.description || result._formatted.subtitle || result._formatted.body || ''
  }
  return result.description || result.subtitle || result.body || ''
}

// Format ranking score for display
const formatRankingScore = (score: number | undefined) => {
  if (score === undefined) return 'N/A'
  return score.toFixed(3)
}
</script>

<template>
  <div class="federated-search w-full">
    <!-- Search Input -->
    <div class="relative">
      <UInput
        v-model="searchQuery"
        :placeholder="placeholder"
        size="lg"
        icon="i-heroicons-magnifying-glass"
        :loading="isSearching"
        :ui="{
          base: 'w-full',
        }"
        @input="handleInput"
      >
        <template #trailing>
          <UButton
            v-if="searchQuery"
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('search.clear')"
            @click="handleClear"
          />
        </template>
      </UInput>

      <!-- Results Count -->
      <div
        v-if="searchQuery && !isSearching && results.length > 0"
        class="mt-2 text-sm text-gray-600 dark:text-gray-400"
      >
        {{ t('search.results_count', { count: estimatedTotalHits }) }}
      </div>
    </div>

    <!-- Search Results -->
    <div
      v-if="searchQuery"
      class="
        mt-4 space-y-2 rounded-lg border border-gray-200 bg-white p-4
        dark:border-gray-700 dark:bg-gray-900
      "
    >
      <!-- Loading State -->
      <div v-if="isSearching" class="space-y-3">
        <USkeleton v-for="i in 3" :key="i" class="h-24 w-full" />
      </div>

      <!-- No Results -->
      <div
        v-else-if="results.length === 0"
        class="py-12 text-center"
      >
        <UIcon
          name="i-heroicons-magnifying-glass-minus"
          class="
            mx-auto mb-4 size-12 text-gray-300
            dark:text-gray-600
          "
        />
        <p class="mb-2 font-medium text-gray-600 dark:text-gray-400">
          {{ t('search.no_results') }}
        </p>
        <p class="text-sm text-gray-500">
          {{ t('search.try_different') }}
        </p>
      </div>

      <!-- Results List -->
      <div
        v-else
        class="
          divide-y divide-gray-100
          dark:divide-gray-800
        "
      >
        <div
          v-for="result in results"
          :key="`${result.content_type}-${result.id}`"
          class="
            group py-4 first:pt-0 last:pb-0
          "
        >
          <!-- Result Header -->
          <div class="mb-2 flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <!-- Content Type Badge -->
              <UBadge
                :label="getContentTypeBadge(result.content_type).label"
                :color="getContentTypeBadge(result.content_type).color"
                variant="subtle"
                size="sm"
              >
                <template #leading>
                  <UIcon
                    :name="getContentTypeBadge(result.content_type).icon"
                    class="size-3"
                  />
                </template>
              </UBadge>

              <!-- Ranking Score -->
              <span
                v-if="result._rankingScore !== undefined"
                class="text-sm text-gray-500 dark:text-gray-400"
                :title="t('search.ranking_score_tooltip')"
              >
                {{ t('search.score') }}: {{ formatRankingScore(result._rankingScore) }}
              </span>
            </div>

            <!-- Federation Metadata (if available) -->
            <span
              v-if="result._federation?.weightedRankingScore !== undefined"
              class="text-sm text-gray-400"
              :title="t('search.weighted_score_tooltip')"
            >
              {{ t('search.weighted') }}: {{ formatRankingScore(result._federation.weightedRankingScore) }}
            </span>
          </div>

          <!-- Result Title -->
          <h3
            class="
              mb-1 line-clamp-2 text-base font-semibold text-gray-900
              transition-colors
              group-hover:text-primary-600
              dark:text-gray-100 dark:group-hover:text-primary-400
            "
            v-html="getDisplayTitle(result)"
          />

          <!-- Result Description with Highlights -->
          <p
            class="
              line-clamp-3 text-sm text-gray-600
              dark:text-gray-400
            "
            v-html="getDisplayDescription(result)"
          />

          <!-- Matches Position Indicators (optional visual feedback) -->
          <div
            v-if="result._matchesPosition && Object.keys(result._matchesPosition).length > 0"
            class="mt-2 flex flex-wrap gap-1"
          >
            <UBadge
              v-for="(matches, field) in result._matchesPosition"
              :key="field"
              :label="`${field} (${matches.length})`"
              color="neutral"
              variant="outline"
              size="sm"
              :title="t('search.matches_in_field', { field })"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  search:
    clear: "Καθαρισμός αναζήτησης"
    results_count: "Βρέθηκαν {count} αποτελέσματα"
    no_results: "Δεν βρέθηκαν αποτελέσματα"
    try_different: "Δοκιμάστε διαφορετικούς όρους αναζήτησης"
    score: "Βαθμολογία"
    weighted: "Σταθμισμένη"
    ranking_score_tooltip: "Βαθμολογία συνάφειας από τον αλγόριθμο κατάταξης Meilisearch"
    weighted_score_tooltip: "Σταθμισμένη βαθμολογία από την ενοποιημένη αναζήτηση"
    matches_in_field: "Αντιστοιχίες στο πεδίο {field}"
    content_types:
      product: "Προϊόν"
      blog_post: "Άρθρο"
</i18n>
