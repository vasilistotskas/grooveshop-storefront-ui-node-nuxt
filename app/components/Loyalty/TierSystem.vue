<script lang="ts" setup>
const { t, locale } = useI18n()
const loyalty = useLoyalty()

// Fetch all data in parallel using new API
const { data: summary, status: summaryStatus } = loyalty.fetchSummary()
const { data: tiers, status: tiersStatus } = loyalty.fetchTiers()
const { data: settings, status: settingsStatus } = loyalty.fetchSettings()

// Computed for overall loading state
const loading = computed(() =>
  summaryStatus.value === 'pending'
  || tiersStatus.value === 'pending'
  || settingsStatus.value === 'pending',
)

// Computed for error state
const error = computed(() =>
  summaryStatus.value === 'error'
  || tiersStatus.value === 'error'
  || settingsStatus.value === 'error',
)

const xpPerLevel = computed(() => settings.value?.xpPerLevel || 1000)

const tiersWithXpRange = computed(() => {
  if (!tiers.value) return []
  return tiers.value.map((tier: LoyaltyTier, index: number) => {
    const nextTier = tiers.value?.[index + 1]
    const minXp = (tier.requiredLevel - 1) * xpPerLevel.value
    const maxXp = nextTier ? (nextTier.requiredLevel - 1) * xpPerLevel.value - 1 : null
    return { ...tier, minXp, maxXp, minLevel: tier.requiredLevel, maxLevel: nextTier ? nextTier.requiredLevel - 1 : null }
  })
})

const getTierName = (tier: LoyaltyTier) => extractTranslated(tier, 'name', locale.value) || 'Unknown'
const getTierDescription = (tier: LoyaltyTier) => extractTranslated(tier, 'description', locale.value) || ''
const isCurrentTier = (tier: LoyaltyTier) => summary.value?.tier?.id === tier.id
const isTierUnlocked = (tier: LoyaltyTier) => summary.value ? summary.value.level >= tier.requiredLevel : false

const getTierIcon = (tier: LoyaltyTier) => {
  const name = getTierName(tier).toLowerCase()
  if (name.includes('bronze') || name.includes('χάλκ')) return 'i-heroicons-shield-check'
  if (name.includes('silver') || name.includes('αργυ')) return 'i-heroicons-star'
  if (name.includes('gold') || name.includes('χρυσ')) return 'i-heroicons-trophy'
  if (name.includes('platinum') || name.includes('πλατ')) return 'i-heroicons-sparkles'
  if (name.includes('diamond') || name.includes('διαμ')) return 'i-heroicons-fire'
  return 'i-heroicons-star'
}

const getMultiplierBonus = (multiplier: string | number) => {
  const mult = typeof multiplier === 'string' ? Number.parseFloat(multiplier) : multiplier
  const bonus = (mult - 1) * 100
  return bonus > 0 ? `+${bonus.toFixed(0)}%` : '0%'
}

const currentTierIndex = computed(() => {
  if (!summary.value?.tier || !tiers.value) return 0
  return tiers.value.findIndex((t: LoyaltyTier) => t.id === summary.value?.tier?.id)
})

const xpProgress = computed(() => {
  if (!summary.value || !tiers.value || currentTierIndex.value === -1) return 0
  const currentTier = tiers.value[currentTierIndex.value]
  const nextTier = tiers.value[currentTierIndex.value + 1]
  if (!currentTier || !nextTier) return 100
  const currentTierMinXp = (currentTier.requiredLevel - 1) * xpPerLevel.value
  const nextTierMinXp = (nextTier.requiredLevel - 1) * xpPerLevel.value
  const xpInCurrentTier = summary.value.totalXp - currentTierMinXp
  const xpNeededForNextTier = nextTierMinXp - currentTierMinXp
  return Math.min(100, Math.max(0, (xpInCurrentTier / xpNeededForNextTier) * 100))
})

const nextTierXp = computed(() => {
  if (!tiers.value || currentTierIndex.value === -1) return 0
  const nextTier = tiers.value[currentTierIndex.value + 1]
  if (!nextTier) return summary.value?.totalXp || 0
  return (nextTier.requiredLevel - 1) * xpPerLevel.value
})

const tierStepperItems = computed(() => {
  if (!tiersWithXpRange.value) return []
  return tiersWithXpRange.value.map((tier: any) => ({
    value: tier.id.toString(),
    title: getTierName(tier),
    description: `${t('level_value', { level: tier.requiredLevel })}+`,
    icon: getTierIcon(tier),
    disabled: !isTierUnlocked(tier),
  }))
})

const tierAccordionItems = computed(() => {
  if (!tiersWithXpRange.value) return []
  return tiersWithXpRange.value.map((tier: any) => ({
    value: tier.id.toString(),
    label: getTierName(tier),
    icon: getTierIcon(tier),
    defaultOpen: isCurrentTier(tier),
    tier,
  }))
})

const handleRetry = () => {
  // Refresh all data sources
  summaryStatus.value = 'pending'
  tiersStatus.value = 'pending'
  settingsStatus.value = 'pending'
}
</script>

<template>
  <div class="space-y-8">
    <!-- Loading State -->
    <div v-if="loading && !tiers" class="space-y-4">
      <USkeleton class="h-64" />
      <USkeleton class="h-48" />
      <USkeleton class="h-96" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="t('error_loading')"
      description="Failed to load tier system data"
    >
      <template #actions>
        <UButton :label="t('retry')" color="error" variant="soft" @click="handleRetry" />
      </template>
    </UAlert>

    <!-- Content -->
    <template v-else-if="tiers && tiersWithXpRange.length > 0">
      <!-- 1. Hero Section: Current Progress -->
      <LoyaltyProgressHero
        v-if="summary"
        :summary="summary"
        :current-tier-icon="summary.tier ? getTierIcon(summary.tier) : 'i-heroicons-trophy'"
        :current-tier-name="summary.tier ? getTierName(summary.tier) : t('no_tier')"
        :xp-progress="xpProgress"
        :next-tier-xp="nextTierXp"
      />

      <!-- 2. Tier Progression Stepper -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-map" class="size-5 text-primary-600 dark:text-primary-400" />
            <h3 class="text-lg font-semibold">
              {{ t('tier_journey') }}
            </h3>
          </div>
        </template>

        <UStepper
          v-if="tierStepperItems.length > 0"
          :items="tierStepperItems"
          :model-value="currentTierIndex"
          :orientation="tierStepperItems.length > 4 ? 'vertical' : 'horizontal'"
          color="primary"
          size="lg"
          class="w-full"
        />
      </UCard>

      <!-- 3. Detailed Tier Information (Accordion) -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-information-circle" class="size-5 text-secondary-600 dark:text-secondary-400" />
            <h3 class="text-lg font-semibold">
              {{ t('tier_details') }}
            </h3>
          </div>
        </template>

        <UAccordion
          v-if="tierAccordionItems.length > 0"
          :items="tierAccordionItems"
          :default-value="summary?.tier?.id.toString()"
          type="single"
          :collapsible="true"
        >
          <template #default="{ item }">
            <div class="flex items-center gap-3">
              <UIcon :name="item.icon" class="size-5" />
              <span class="font-medium">{{ item.label }}</span>
              <UBadge
                v-if="isCurrentTier(item.tier)"
                :label="t('current')"
                color="primary"
                size="sm"
                variant="soft"
              />
              <UBadge
                v-else-if="isTierUnlocked(item.tier)"
                :label="t('unlocked')"
                color="success"
                size="sm"
                variant="soft"
              />
              <UBadge
                v-else
                :label="t('locked')"
                color="neutral"
                size="sm"
                variant="soft"
              />
            </div>
          </template>

          <template #content="{ item }">
            <div class="space-y-4 py-2">
              <!-- Description -->
              <p class="text-sm text-gray-700 dark:text-gray-300">
                {{ getTierDescription(item.tier) }}
              </p>

              <!-- Requirements -->
              <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <h4 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <UIcon name="i-heroicons-key" class="size-4" />
                  {{ t('requirements') }}
                </h4>
                <div class="space-y-2 text-sm">
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600 dark:text-gray-400">{{ t('required_level') }}</span>
                    <span class="font-semibold">{{ t('level_value', { level: item.tier.requiredLevel }) }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600 dark:text-gray-400">{{ t('min_xp') }}</span>
                    <span class="font-semibold">{{ item.tier.minXp.toLocaleString() }} XP</span>
                  </div>
                  <div v-if="item.tier.maxXp !== null" class="flex items-center justify-between">
                    <span class="text-gray-600 dark:text-gray-400">{{ t('max_xp') }}</span>
                    <span class="font-semibold">{{ item.tier.maxXp.toLocaleString() }} XP</span>
                  </div>
                </div>
              </div>

              <!-- Benefits -->
              <div class="rounded-lg bg-success-50 p-4 dark:bg-success-950">
                <h4 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <UIcon name="i-heroicons-gift" class="size-4" />
                  {{ t('benefits') }}
                </h4>
                <div class="space-y-2">
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-check-circle" class="size-4 shrink-0 text-success-600 dark:text-success-400 mt-0.5" />
                    <span class="text-gray-700 dark:text-gray-300">
                      {{ t('points_multiplier', { bonus: getMultiplierBonus(item.tier.pointsMultiplier) }) }}
                    </span>
                  </div>
                  <div v-if="Number(item.tier.pointsMultiplier) > 1" class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-check-circle" class="size-4 shrink-0 text-success-600 dark:text-success-400 mt-0.5" />
                    <span class="text-gray-700 dark:text-gray-300">
                      {{ t('faster_earning') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UAccordion>
      </UCard>

      <!-- 4. How It Works (Collapsible) -->
      <UCollapsible>
        <template #trigger>
          <div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800">
            <UIcon name="i-heroicons-question-mark-circle" class="size-5 text-info-600 dark:text-info-400" />
            <span class="font-medium text-gray-900 dark:text-gray-100">{{ t('how_it_works_title') }}</span>
            <UIcon name="i-heroicons-chevron-down" class="ml-auto size-5 text-gray-400" />
          </div>
        </template>

        <div class="mt-4 space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <!-- How It Works -->
          <div class="space-y-3">
            <h4 class="font-semibold text-gray-900 dark:text-gray-100">
              {{ t('how_it_works_subtitle') }}
            </h4>
            <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li class="flex items-start gap-2">
                <UIcon name="i-heroicons-check" class="size-4 shrink-0 text-primary-600 dark:text-primary-400 mt-0.5" />
                <span>{{ t('how_it_works_1', { xp: xpPerLevel.toLocaleString() }) }}</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-heroicons-check" class="size-4 shrink-0 text-primary-600 dark:text-primary-400 mt-0.5" />
                <span>{{ t('how_it_works_2') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-heroicons-check" class="size-4 shrink-0 text-primary-600 dark:text-primary-400 mt-0.5" />
                <span>{{ t('how_it_works_3') }}</span>
              </li>
            </ul>
          </div>

          <USeparator />

          <!-- Level Calculation -->
          <div class="space-y-3">
            <h4 class="font-semibold text-gray-900 dark:text-gray-100">
              {{ t('level_calculation') }}
            </h4>
            <div class="rounded-lg bg-secondary-50 p-4 dark:bg-secondary-950">
              <p class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ t('formula') }}:
              </p>
              <code class="block rounded bg-gray-900 p-2 text-xs text-gray-100 dark:bg-gray-800">
                Level = 1 + (Total XP ÷ {{ xpPerLevel.toLocaleString() }})
              </code>
              <div class="mt-3 space-y-1 text-xs text-gray-700 dark:text-gray-300">
                <div>• 0 XP = {{ t('level_value', { level: 1 }) }}</div>
                <div>• {{ xpPerLevel.toLocaleString() }} XP = {{ t('level_value', { level: 2 }) }}</div>
                <div>• {{ (xpPerLevel * 5).toLocaleString() }} XP = {{ t('level_value', { level: 6 }) }}</div>
              </div>
            </div>
          </div>
        </div>
      </UCollapsible>
    </template>
  </div>
</template>

<i18n lang="yaml">
el:
  error_loading: "Αποτυχία φόρτωσης δεδομένων"
  retry: "Δοκιμάστε ξανά"
  level_badge: "Επίπεδο {level}"
  your_current_tier: "Η τρέχουσα βαθμίδα σας"
  no_tier: "Καμία βαθμίδα"
  xp_progress: "Πρόοδος XP"
  xp_to_next_tier: "{xp} XP μέχρι την επόμενη βαθμίδα"
  max_tier_reached: "Έχετε φτάσει τη μέγιστη βαθμίδα!"
  level: "Επίπεδο"
  points: "Πόντοι"
  total_xp: "Συνολικό XP"
  tier_journey: "Το Ταξίδι των Βαθμίδων"
  tier_details: "Λεπτομέρειες Βαθμίδων"
  current: "ΤΡΕΧΟΥΣΑ"
  unlocked: "ΞΕΚΛΕΙΔΩΜΕΝΗ"
  locked: "ΚΛΕΙΔΩΜΕΝΗ"
  requirements: "Απαιτήσεις"
  required_level: "Απαιτούμενο Επίπεδο"
  level_value: "Επίπεδο {level}"
  min_xp: "Ελάχιστο XP"
  max_xp: "Μέγιστο XP"
  benefits: "Οφέλη"
  points_multiplier: "Πολλαπλασιαστής πόντων {bonus}"
  faster_earning: "Ταχύτερη συλλογή πόντων"
  how_it_works_title: "Πώς λειτουργεί το σύστημα βαθμίδων;"
  how_it_works_subtitle: "Βασικές Αρχές"
  how_it_works_1: "Κερδίζετε XP με κάθε αγορά ({xp} XP = 1 επίπεδο)"
  how_it_works_2: "Το επίπεδό σας αυξάνεται αυτόματα με το XP"
  how_it_works_3: "Ξεκλειδώνετε νέες βαθμίδες με υψηλότερα επίπεδα"
  level_calculation: "Υπολογισμός Επιπέδου"
  formula: "Τύπος"
en:
  error_loading: "Failed to load data"
  retry: "Try again"
  level_badge: "Level {level}"
  your_current_tier: "Your current tier"
  no_tier: "No tier"
  xp_progress: "XP Progress"
  xp_to_next_tier: "{xp} XP until next tier"
  max_tier_reached: "You've reached the maximum tier!"
  level: "Level"
  points: "Points"
  total_xp: "Total XP"
  tier_journey: "Tier Journey"
  tier_details: "Tier Details"
  current: "CURRENT"
  unlocked: "UNLOCKED"
  locked: "LOCKED"
  requirements: "Requirements"
  required_level: "Required Level"
  level_value: "Level {level}"
  min_xp: "Minimum XP"
  max_xp: "Maximum XP"
  benefits: "Benefits"
  points_multiplier: "Points multiplier {bonus}"
  faster_earning: "Faster points earning"
  how_it_works_title: "How does the tier system work?"
  how_it_works_subtitle: "Basic Principles"
  how_it_works_1: "Earn XP with every purchase ({xp} XP = 1 level)"
  how_it_works_2: "Your level increases automatically with XP"
  how_it_works_3: "Unlock new tiers at higher levels"
  level_calculation: "Level Calculation"
  formula: "Formula"
de:
  error_loading: "Fehler beim Laden der Daten"
  retry: "Erneut versuchen"
  level_badge: "Level {level}"
  your_current_tier: "Ihre aktuelle Stufe"
  no_tier: "Keine Stufe"
  xp_progress: "XP-Fortschritt"
  xp_to_next_tier: "{xp} XP bis zur nächsten Stufe"
  max_tier_reached: "Sie haben die maximale Stufe erreicht!"
  level: "Level"
  points: "Punkte"
  total_xp: "Gesamt-XP"
  tier_journey: "Stufenreise"
  tier_details: "Stufendetails"
  current: "AKTUELL"
  unlocked: "FREIGESCHALTET"
  locked: "GESPERRT"
  requirements: "Anforderungen"
  required_level: "Erforderliches Level"
  level_value: "Level {level}"
  min_xp: "Minimum XP"
  max_xp: "Maximum XP"
  benefits: "Vorteile"
  points_multiplier: "Punktemultiplikator {bonus}"
  faster_earning: "Schnelleres Punktesammeln"
  how_it_works_title: "Wie funktioniert das Stufensystem?"
  how_it_works_subtitle: "Grundprinzipien"
  how_it_works_1: "Verdienen Sie XP bei jedem Einkauf ({xp} XP = 1 Level)"
  how_it_works_2: "Ihr Level steigt automatisch mit XP"
  how_it_works_3: "Schalten Sie neue Stufen bei höheren Levels frei"
  level_calculation: "Level-Berechnung"
  formula: "Formel"
</i18n>
