<script lang="ts" setup>
const { t, locale } = useI18n()
const { summary, tiers, settings, loading, error, fetchSummary, fetchTiers, fetchSettings } = useLoyalty()

// Fetch data on mount
onMounted(async () => {
  await Promise.all([
    fetchSummary(),
    fetchTiers(),
    fetchSettings(),
  ])
})

// Get XP per level from settings
const xpPerLevel = computed(() => settings.value?.xpPerLevel || 1000)

// Calculate XP range for each tier
const tiersWithXpRange = computed(() => {
  if (!tiers.value) return []

  return tiers.value.map((tier, index) => {
    const nextTier = tiers.value?.[index + 1]
    const minXp = (tier.requiredLevel - 1) * xpPerLevel.value
    const maxXp = nextTier
      ? (nextTier.requiredLevel - 1) * xpPerLevel.value - 1
      : null

    return {
      ...tier,
      minXp,
      maxXp,
      minLevel: tier.requiredLevel,
      maxLevel: nextTier ? nextTier.requiredLevel - 1 : null,
    }
  })
})

// Get translated tier name
const getTierName = (tier: any) => {
  return tier.translations?.[locale.value]?.name || tier.translations?.en?.name || 'Unknown'
}

// Get translated tier description
const getTierDescription = (tier: any) => {
  return tier.translations?.[locale.value]?.description || tier.translations?.en?.description || ''
}

// Check if tier is current user's tier
const isCurrentTier = (tier: any) => {
  return summary.value?.tier?.id === tier.id
}

// Check if tier is unlocked
const isTierUnlocked = (tier: any) => {
  if (!summary.value) return false
  return summary.value.level >= tier.requiredLevel
}

// Tier color mapping
const getTierColor = (tier: any): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
  const name = getTierName(tier).toLowerCase()
  if (name.includes('bronze') || name.includes('χάλκινο') || name.includes('χάλκ')) return 'warning'
  if (name.includes('silver') || name.includes('αργυρό') || name.includes('αργυ')) return 'neutral'
  if (name.includes('gold') || name.includes('χρυσό') || name.includes('χρυσ')) return 'warning'
  if (name.includes('platinum') || name.includes('πλατίνα') || name.includes('πλατ')) return 'info'
  if (name.includes('diamond') || name.includes('διαμάντι') || name.includes('διαμ')) return 'secondary'
  return 'primary'
}

// Tier icon mapping
const getTierIcon = (tier: any) => {
  const name = getTierName(tier).toLowerCase()
  if (name.includes('bronze') || name.includes('χάλκινο') || name.includes('χάλκ')) return 'i-heroicons-shield'
  if (name.includes('silver') || name.includes('αργυρό') || name.includes('αργυ')) return 'i-heroicons-star'
  if (name.includes('gold') || name.includes('χρυσό') || name.includes('χρυσ')) return 'i-heroicons-trophy'
  if (name.includes('platinum') || name.includes('πλατίνα') || name.includes('πλατ')) return 'i-heroicons-sparkles'
  if (name.includes('diamond') || name.includes('διαμάντι') || name.includes('διαμ')) return 'i-heroicons-fire'
  return 'i-heroicons-star'
}

// Format multiplier as percentage bonus
const getMultiplierBonus = (multiplier: string | number) => {
  const mult = typeof multiplier === 'string' ? Number.parseFloat(multiplier) : multiplier
  const bonus = (mult - 1) * 100
  return bonus > 0 ? `+${bonus.toFixed(0)}%` : '0%'
}

const handleRetry = () => {
  Promise.all([
    fetchSummary(),
    fetchTiers(),
    fetchSettings(),
  ])
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading && !tiers" class="space-y-4">
      <USkeleton class="h-48" />
      <USkeleton class="h-64" />
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

    <!-- Content -->
    <template v-else-if="tiers && tiersWithXpRange.length > 0">
      <!-- Header Section -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
              <UIcon name="i-heroicons-trophy" class="size-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 class="text-xl font-bold">
                {{ t('title') }}
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ t('subtitle') }}
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <!-- How It Works -->
          <div class="rounded-lg bg-primary-50 p-4 dark:bg-primary-950">
            <div class="flex items-start gap-3">
              <UIcon name="i-heroicons-information-circle" class="size-5 shrink-0 text-primary-600 dark:text-primary-400 mt-0.5" />
              <div class="text-sm">
                <p class="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {{ t('how_it_works_title') }}
                </p>
                <ul class="space-y-1 text-gray-700 dark:text-gray-300">
                  <li>• {{ t('how_it_works_1', { xp: xpPerLevel.toLocaleString() }) }}</li>
                  <li>• {{ t('how_it_works_2') }}</li>
                  <li>• {{ t('how_it_works_3') }}</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Current Progress (if user is logged in) -->
          <div v-if="summary" class="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-950">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-user-circle" class="size-5 text-primary-600 dark:text-primary-400" />
                <span class="font-semibold text-gray-900 dark:text-gray-100">{{ t('your_progress') }}</span>
              </div>
              <UBadge
                :label="t('level_badge', { level: summary.level })"
                color="primary"
                size="lg"
              />
            </div>
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-lg bg-white p-3 dark:bg-gray-900">
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {{ t('total_xp') }}
                </div>
                <div class="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {{ summary.totalXp.toLocaleString() }}
                </div>
              </div>
              <div class="rounded-lg bg-white p-3 dark:bg-gray-900">
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {{ t('current_tier') }}
                </div>
                <div class="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {{ summary.tier ? getTierName(summary.tier) : t('no_tier') }}
                </div>
              </div>
              <div class="rounded-lg bg-white p-3 dark:bg-gray-900">
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {{ t('next_tier_in') }}
                </div>
                <div class="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {{ summary.pointsToNextTier !== null ? summary.pointsToNextTier.toLocaleString() + ' XP' : t('max_tier') }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Tiers Grid -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="(tier, index) in tiersWithXpRange"
          :key="tier.id"
          :class="[
            'relative overflow-hidden transition-all duration-200',
            isCurrentTier(tier) ? 'ring-2 ring-primary-500 shadow-lg scale-105' : '',
            isTierUnlocked(tier) ? 'opacity-100' : 'opacity-60',
          ]"
        >
          <!-- Current Tier Badge -->
          <div
            v-if="isCurrentTier(tier)"
            class="absolute top-0 right-0 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg"
          >
            {{ t('current') }}
          </div>

          <!-- Unlocked/Locked Badge -->
          <div
            class="absolute top-0 left-0 px-3 py-1 rounded-br-lg text-xs font-medium"
            :class="isTierUnlocked(tier) ? 'bg-success-500 text-white' : 'bg-gray-400 text-white dark:bg-gray-600'"
          >
            {{ isTierUnlocked(tier) ? t('unlocked') : t('locked') }}
          </div>

          <template #header>
            <div class="flex items-center gap-3 pt-6">
              <div
                class="flex size-14 shrink-0 items-center justify-center rounded-full"
                :class="`bg-${getTierColor(tier)}-100 dark:bg-${getTierColor(tier)}-900`"
              >
                <UIcon
                  :name="getTierIcon(tier)"
                  class="size-7"
                  :class="`text-${getTierColor(tier)}-600 dark:text-${getTierColor(tier)}-400`"
                />
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold">
                  {{ getTierName(tier) }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ t('tier_number', { number: index + 1 }) }}
                </p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Description -->
            <p class="text-sm text-gray-700 dark:text-gray-300">
              {{ getTierDescription(tier) }}
            </p>

            <USeparator />

            <!-- Requirements -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">{{ t('required_level') }}</span>
                <span class="font-semibold">{{ t('level_value', { level: tier.minLevel }) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">{{ t('min_xp') }}</span>
                <span class="font-semibold">{{ tier.minXp.toLocaleString() }} XP</span>
              </div>
              <div v-if="tier.maxXp !== null" class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">{{ t('max_xp') }}</span>
                <span class="font-semibold">{{ tier.maxXp.toLocaleString() }} XP</span>
              </div>
            </div>

            <USeparator />

            <!-- Benefits -->
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                <UIcon name="i-heroicons-gift" class="size-4" />
                <span>{{ t('benefits') }}</span>
              </div>
              <div class="space-y-1.5">
                <div class="flex items-center gap-2 text-sm">
                  <UIcon name="i-heroicons-check-circle" class="size-4 text-success-600 dark:text-success-400" />
                  <span class="text-gray-700 dark:text-gray-300">
                    {{ t('points_multiplier', { bonus: getMultiplierBonus(tier.pointsMultiplier) }) }}
                  </span>
                </div>
                <div v-if="Number(tier.pointsMultiplier) > 1" class="flex items-center gap-2 text-sm">
                  <UIcon name="i-heroicons-check-circle" class="size-4 text-success-600 dark:text-success-400" />
                  <span class="text-gray-700 dark:text-gray-300">
                    {{ t('faster_earning') }}
                  </span>
                </div>
                <div v-if="index >= 2" class="flex items-center gap-2 text-sm">
                  <UIcon name="i-heroicons-check-circle" class="size-4 text-success-600 dark:text-success-400" />
                  <span class="text-gray-700 dark:text-gray-300">
                    {{ t('exclusive_rewards') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Level System Explanation -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-academic-cap" class="size-5 text-secondary-600 dark:text-secondary-400" />
            <h3 class="text-lg font-semibold">
              {{ t('level_system_title') }}
            </h3>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            {{ t('level_system_description', { xp: xpPerLevel.toLocaleString() }) }}
          </p>

          <!-- Example Calculation -->
          <div class="rounded-lg bg-secondary-50 p-4 dark:bg-secondary-950">
            <div class="flex items-start gap-3">
              <UIcon name="i-heroicons-calculator" class="size-5 shrink-0 text-secondary-600 dark:text-secondary-400 mt-0.5" />
              <div class="text-sm">
                <p class="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {{ t('example_calculation') }}
                </p>
                <div class="space-y-1 text-gray-700 dark:text-gray-300 font-mono text-xs">
                  <div>{{ t('formula') }}: <span class="font-bold">Level = 1 + (Total XP ÷ {{ xpPerLevel.toLocaleString() }})</span></div>
                  <div class="mt-2">
                    {{ t('examples') }}:
                  </div>
                  <div>• 0 XP = {{ t('level_value', { level: 1 }) }}</div>
                  <div>• {{ xpPerLevel.toLocaleString() }} XP = {{ t('level_value', { level: 2 }) }}</div>
                  <div>• {{ (xpPerLevel * 5).toLocaleString() }} XP = {{ t('level_value', { level: 6 }) }}</div>
                  <div>• {{ (xpPerLevel * 10).toLocaleString() }} XP = {{ t('level_value', { level: 11 }) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- How to Earn XP -->
          <div class="rounded-lg bg-success-50 p-4 dark:bg-success-950">
            <div class="flex items-start gap-3">
              <UIcon name="i-heroicons-arrow-trending-up" class="size-5 shrink-0 text-success-600 dark:text-success-400 mt-0.5" />
              <div class="text-sm">
                <p class="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {{ t('how_to_earn_xp') }}
                </p>
                <ul class="space-y-1 text-gray-700 dark:text-gray-300">
                  <li>• {{ t('earn_xp_1') }}</li>
                  <li>• {{ t('earn_xp_2') }}</li>
                  <li>• {{ t('earn_xp_3') }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>

<i18n lang="yaml">
el:
  title: "Σύστημα Βαθμίδων & Επιπέδων"
  subtitle: "Ανακαλύψτε όλες τις βαθμίδες και τα οφέλη τους"
  how_it_works_title: "Πώς Λειτουργεί"
  how_it_works_1: "Κερδίζετε XP με κάθε αγορά ({xp} XP = 1 επίπεδο)"
  how_it_works_2: "Το επίπεδό σας αυξάνεται αυτόματα με το XP"
  how_it_works_3: "Ξεκλειδώνετε νέες βαθμίδες με υψηλότερα επίπεδα"
  your_progress: "Η Πρόοδός Σας"
  level_badge: "Επίπεδο {level}"
  total_xp: "Συνολικό XP"
  current_tier: "Τρέχουσα Βαθμίδα"
  next_tier_in: "Επόμενη Βαθμίδα σε"
  no_tier: "Καμία"
  max_tier: "Μέγιστη"
  tier_number: "Βαθμίδα {number}"
  current: "ΤΡΕΧΟΥΣΑ"
  unlocked: "ΞΕΚΛΕΙΔΩΜΕΝΗ"
  locked: "ΚΛΕΙΔΩΜΕΝΗ"
  required_level: "Απαιτούμενο Επίπεδο"
  level_value: "Επίπεδο {level}"
  min_xp: "Ελάχιστο XP"
  max_xp: "Μέγιστο XP"
  benefits: "Οφέλη"
  points_multiplier: "Πολλαπλασιαστής πόντων {bonus}"
  faster_earning: "Ταχύτερη συλλογή πόντων"
  exclusive_rewards: "Αποκλειστικές ανταμοιβές"
  level_system_title: "Πώς Λειτουργεί το Σύστημα Επιπέδων"
  level_system_description: "Το επίπεδό σας υπολογίζεται αυτόματα από το συνολικό σας XP. Κάθε {xp} XP σας ανεβάζει ένα επίπεδο."
  example_calculation: "Παράδειγμα Υπολογισμού"
  formula: "Τύπος"
  examples: "Παραδείγματα"
  how_to_earn_xp: "Πώς να Κερδίσετε XP"
  earn_xp_1: "Ολοκληρώστε αγορές για να κερδίσετε XP"
  earn_xp_2: "Όσο υψηλότερη η βαθμίδα σας, τόσο περισσότερα XP κερδίζετε"
  earn_xp_3: "Το XP δεν λήγει ποτέ - συσσωρεύεται για πάντα"
  error_loading: "Αποτυχία φόρτωσης δεδομένων συστήματος βαθμίδων"
  retry: "Δοκιμάστε ξανά"
</i18n>
