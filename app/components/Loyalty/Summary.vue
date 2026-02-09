<script lang="ts" setup>
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { summary, loading, error, fetchSummary } = useLoyalty()

// Fetch summary on mount
onMounted(() => {
  fetchSummary()
})

// Get translated tier name and description
const tierName = computed(() => {
  if (!summary.value?.tier) return null
  const translations = summary.value.tier.translations
  return translations?.[locale.value]?.name || null
})

const tierDescription = computed(() => {
  if (!summary.value?.tier) return null
  const translations = summary.value.tier.translations
  return translations?.[locale.value]?.description || null
})

// Calculate coin value in EUR (100 points = 1 EUR by default)
const coinValueInEur = computed(() => {
  if (!summary.value) return '0.00'
  const ratio = 100 // Default: 100 points = 1 EUR
  const value = summary.value.pointsBalance / ratio
  return value.toFixed(2)
})

// Calculate XP progress percentage
const xpProgressPercentage = computed(() => {
  if (!summary.value) return 0
  if (summary.value.pointsToNextTier === null) return 100

  // Estimate total XP needed for next tier (this is approximate)
  const totalNeeded = summary.value.totalXp + summary.value.pointsToNextTier
  return Math.round((summary.value.totalXp / totalNeeded) * 100)
})

// Tier color mapping
const tierColor = computed<'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'>(() => {
  if (!tierName.value) return 'neutral'
  const name = tierName.value.toLowerCase()
  if (name.includes('bronze') || name.includes('χάλκινο')) return 'warning'
  if (name.includes('silver') || name.includes('αργυρό')) return 'neutral'
  if (name.includes('gold') || name.includes('χρυσό')) return 'warning'
  if (name.includes('platinum') || name.includes('πλατίνα')) return 'info'
  if (name.includes('diamond') || name.includes('διαμάντι')) return 'secondary'
  return 'primary'
})

const handleRetry = () => {
  fetchSummary()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="grid gap-6 md:grid-cols-2">
      <USkeleton class="h-137.5" />
      <USkeleton class="h-137.5" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="t('error_loading')"
      :description="error.message"
    >
      <template #actions>
        <UButton
          :label="t('retry')"
          color="error"
          variant="soft"
          @click="handleRetry"
        />
      </template>
    </UAlert>

    <!-- Summary Content -->
    <template v-else-if="summary">
      <!-- Two Column Layout: Points & Level/XP -->
      <div class="grid gap-6 md:grid-cols-2">
        <!-- LEFT: LOYALTY POINTS CARD -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-currency-dollar" class="size-5 text-warning-600 dark:text-warning-400" />
                <h3 class="text-lg font-semibold">
                  {{ t('points_section_title') }}
                </h3>
              </div>
              <UTooltip :text="t('points_tooltip')">
                <UIcon name="i-heroicons-information-circle" class="size-5 text-gray-400 cursor-help" />
              </UTooltip>
            </div>
          </template>

          <div class="space-y-6">
            <!-- Points Display with Hexagon -->
            <div class="flex flex-col items-center justify-center py-6">
              <div class="relative mb-4">
                <div class="absolute inset-0 bg-warning-200 dark:bg-warning-800 opacity-20 blur-2xl rounded-full" />
                <div class="relative flex flex-col items-center justify-center w-40 h-40 bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-950 dark:to-warning-900 rounded-full shadow-lg">
                  <!-- Hexagon SVG -->
                  <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="pointsHexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:rgb(251, 191, 36);stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:rgb(245, 158, 11);stop-opacity:0.5" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                      fill="url(#pointsHexGradient)"
                      stroke="rgb(245, 158, 11)"
                      stroke-width="2"
                    />
                  </svg>
                  <!-- Points Number -->
                  <div class="relative z-10 text-center">
                    <div class="text-5xl font-bold text-warning-700 dark:text-warning-300">
                      {{ summary.pointsBalance }}
                    </div>
                    <div class="text-sm font-medium text-warning-600 dark:text-warning-400 mt-1">
                      {{ t('coins_label') }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Points Value in EUR -->
              <div class="text-center">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  {{ t('points_value_label') }}
                </p>
                <p class="text-2xl font-bold text-warning-700 dark:text-warning-300">
                  {{ coinValueInEur }} €
                </p>
              </div>
            </div>

            <USeparator />

            <!-- Points Info -->
            <div class="space-y-3">
              <div class="flex items-start gap-3 p-3 bg-warning-50 dark:bg-warning-950 rounded-lg">
                <UIcon name="i-heroicons-light-bulb" class="size-5 text-warning-600 dark:text-warning-400 mt-0.5 shrink-0" />
                <div class="text-sm text-gray-700 dark:text-gray-300">
                  <p class="font-medium mb-1">
                    {{ t('points_info_title') }}
                  </p>
                  <p class="text-gray-600 dark:text-gray-300">
                    {{ t('points_info_description') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- RIGHT: LEVEL & XP CARD -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-trophy" class="size-5 text-primary-600 dark:text-primary-400" />
                <h3 class="text-lg font-semibold">
                  {{ t('level_section_title') }}
                </h3>
              </div>
              <UTooltip :text="t('level_tooltip')">
                <UIcon name="i-heroicons-information-circle" class="size-5 text-gray-400 cursor-help" />
              </UTooltip>
            </div>
          </template>

          <div class="space-y-6">
            <!-- Level Display -->
            <div class="flex flex-col items-center justify-center py-6">
              <div class="flex items-center justify-center gap-3 mb-4">
                <UIcon name="i-heroicons-star-solid" class="size-8 text-primary-600 dark:text-primary-400" />
                <span class="text-5xl font-bold text-primary-700 dark:text-primary-300">
                  {{ summary.level }}
                </span>
              </div>
              <p class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('level_display', { level: summary.level }) }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{ t('total_xp_display', { xp: summary.totalXp.toLocaleString() }) }}
              </p>

              <!-- Tier Badge -->
              <div class="mt-4">
                <UBadge
                  v-if="summary.tier"
                  :label="tierName || ''"
                  :color="tierColor"
                  size="lg"
                  class="px-4 py-2"
                />
                <UBadge
                  v-else
                  :label="t('no_tier_assigned')"
                  color="neutral"
                  size="lg"
                  class="px-4 py-2"
                />
              </div>
            </div>

            <USeparator />

            <!-- XP Progress Section -->
            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-gray-700 dark:text-gray-300">
                  {{ t('progress_to_next') }}
                </span>
                <span class="font-semibold text-primary-600 dark:text-primary-400">
                  <template v-if="summary.pointsToNextTier !== null">
                    {{ summary.pointsToNextTier.toLocaleString() }} XP
                  </template>
                  <template v-else>
                    {{ t('max_level') }}
                  </template>
                </span>
              </div>
              <UProgress
                v-model="xpProgressPercentage"
                color="secondary"
                size="xl"
                :animation="undefined"
                status
                :ui="{
                  status: 'text-secondary',
                }"
              />
            </div>

            <!-- Tier Description -->
            <div v-if="tierDescription" class="p-3 bg-primary-50 dark:bg-primary-950 rounded-lg">
              <div class="flex items-start gap-3">
                <UIcon name="i-heroicons-sparkles" class="size-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
                <div class="text-sm">
                  <p class="font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {{ tierName }}
                  </p>
                  <p class="text-gray-600 dark:text-gray-300">
                    {{ tierDescription }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Quick Actions -->
      <div class="grid gap-4 md:grid-cols-2">
        <UCard class="hover:shadow-lg transition-shadow cursor-pointer" @click="navigateTo(localePath('products'))">
          <div class="flex items-center gap-4">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
              <UIcon name="i-heroicons-shopping-bag" class="size-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div class="flex-1">
              <h4 class="font-semibold mb-1">
                {{ t('earn_more_points') }}
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{ t('shop_to_earn') }}
              </p>
            </div>
            <UIcon name="i-heroicons-arrow-right" class="size-5 text-gray-400" />
          </div>
        </UCard>

        <UCard class="hover:shadow-lg transition-shadow cursor-pointer" @click="navigateTo(localePath('loyalty-program'))">
          <div class="flex items-center gap-4">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-success-100 dark:bg-success-900">
              <UIcon name="i-heroicons-information-circle" class="size-6 text-success-600 dark:text-success-400" />
            </div>
            <div class="flex-1">
              <h4 class="font-semibold mb-1">
                {{ t('learn_more') }}
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{ t('how_it_works') }}
              </p>
            </div>
            <UIcon name="i-heroicons-arrow-right" class="size-5 text-gray-400" />
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>

<i18n lang="yaml">
el:
  points_section_title: "Πόντοι"
  level_section_title: "Επίπεδο & Πρόοδος"
  points_tooltip: "Οι πόντοι μπορούν να εξαργυρωθούν για εκπτώσεις στις αγορές σας"
  level_tooltip: "Το επίπεδό σας αυξάνεται με XP από αγορές και δραστηριότητες"
  coins_label: "Πόντοι"
  points_value_label: "Αξία σε έκπτωση"
  points_info_title: "Τι είναι οι Πόντοι;"
  points_info_description: "Κερδίζετε πόντους με κάθε αγορά. Εξαργυρώστε τους για εκπτώσεις (100 πόντοι = 1€)."
  level_display: "Επίπεδο {level}"
  total_xp_display: "{xp} XP συνολικά"
  progress_to_next: "Πρόοδος προς το επόμενο επίπεδο"
  max_level: "Μέγιστο επίπεδο"
  no_tier_assigned: "Δεν έχει ανατεθεί βαθμίδα"
  error_loading: "Αποτυχία φόρτωσης δεδομένων"
  retry: "Δοκιμάστε ξανά"
  earn_more_points: "Κερδίστε περισσότερους πόντους"
  shop_to_earn: "Αγοράστε για να κερδίσετε πόντους και XP"
  learn_more: "Μάθετε περισσότερα"
  how_it_works: "Πώς λειτουργεί το πρόγραμμα επιβράβευσης"
</i18n>
