<script lang="ts" setup>
const { t, locale } = useI18n()
const loyalty = useLoyalty()

const { data: summary, status: summaryStatus } = loyalty.fetchSummary()
const { data: tiers, status: tiersStatus } = loyalty.fetchTiers()
const { data: settings, status: settingsStatus } = loyalty.fetchSettings()

const loading = computed(() =>
  summaryStatus.value === 'pending'
  || tiersStatus.value === 'pending'
  || settingsStatus.value === 'pending',
)

const error = computed(() =>
  summaryStatus.value === 'error'
  || tiersStatus.value === 'error'
  || settingsStatus.value === 'error',
)

const xpPerLevel = computed(() => settings.value?.xpPerLevel || 1000)

const currentTierIndex = computed(() => {
  if (!summary.value?.tier || !tiers.value) return 0
  return tiers.value.findIndex((tier: LoyaltyTier) => tier.id === summary.value?.tier?.id)
})

const currentTierName = computed(() => {
  if (!summary.value?.tier) return t('no_tier')
  return extractTranslated(summary.value.tier, 'name', locale.value) || t('no_tier')
})

const currentTierIcon = computed(() => {
  if (!summary.value?.tier) return 'i-heroicons-trophy'
  const name = currentTierName.value.toLowerCase()
  if (name.includes('bronze') || name.includes('χάλκ')) return 'i-heroicons-shield-check'
  if (name.includes('silver') || name.includes('αργυ')) return 'i-heroicons-star'
  if (name.includes('gold') || name.includes('χρυσ')) return 'i-heroicons-trophy'
  if (name.includes('platinum') || name.includes('πλατ')) return 'i-heroicons-sparkles'
  if (name.includes('diamond') || name.includes('διαμ')) return 'i-heroicons-fire'
  return 'i-heroicons-star'
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

const ready = computed(() => !loading.value && !error.value && summary.value)
</script>

<template>
  <div v-if="loading && !summary">
    <USkeleton class="h-48 rounded-xl" />
  </div>

  <UCard
    v-else-if="ready"
    class="overflow-hidden"
    :ui="{
      root: `
        bg-linear-to-br from-primary-50 via-secondary-50 to-primary-50
        dark:from-primary-950/40 dark:via-secondary-950/30
        dark:to-primary-950/40
      `,
      body: 'sm:p-6',
    }"
    variant="subtle"
  >
    <div class="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
      <!-- Tier Icon -->
      <div class="relative shrink-0">
        <div
          class="
            flex size-20 items-center justify-center rounded-2xl
            bg-linear-to-br from-primary-500 to-secondary-500 shadow-lg
            sm:size-24
          "
        >
          <UIcon :name="currentTierIcon" class="size-10 text-white sm:size-12" />
        </div>
        <UBadge
          :label="String(summary!.level)"
          color="primary"
          size="lg"
          class="absolute font-bold -bottom-1.5 -right-1.5 ring-2 ring-white dark:ring-neutral-900"
        />
      </div>

      <!-- Info -->
      <div class="flex-1 text-center sm:text-left">
        <h3
          class="
            text-xl font-bold text-primary-950
            dark:text-primary-50
            sm:text-2xl
          "
        >
          {{ currentTierName }}
        </h3>
        <p
          class="
            mt-0.5 text-sm text-neutral-600
            dark:text-neutral-300
          "
        >
          {{ t('level_display', { level: summary!.level }) }} &middot; {{ summary!.totalXp.toLocaleString() }} XP
        </p>

        <!-- XP Progress -->
        <div class="mt-4 space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-neutral-600 dark:text-neutral-300">
              {{ t('xp_progress') }}
            </span>
            <span class="font-bold text-lg text-primary-900 dark:text-primary-100">
              {{ summary!.totalXp.toLocaleString() }} / {{ nextTierXp.toLocaleString() }} XP
            </span>
          </div>
          <UProgress
            :model-value="xpProgress"
            :max="100"
            size="lg"
            color="secondary"
          />
          <p
            v-if="summary!.pointsToNextTier !== null"
            class="text-xs text-neutral-500 dark:text-neutral-300"
          >
            {{ t('xp_to_next_tier', { xp: summary!.pointsToNextTier!.toLocaleString() }) }}
          </p>
          <p
            v-else
            class="text-xs font-medium text-success-600 dark:text-success-400"
          >
            {{ t('max_tier_reached') }}
          </p>
        </div>

        <!-- Quick Stats -->
        <div class="mt-4 flex justify-center gap-4 sm:justify-start">
          <div
            class="
              flex items-center gap-2 rounded-lg bg-white/60 px-3 py-1.5
              dark:bg-neutral-900/40
            "
          >
            <UIcon name="i-heroicons-star" class="size-4 text-primary-500" />
            <span class="text-sm font-semibold text-primary-950 dark:text-primary-50">
              {{ summary!.level }}
            </span>
            <span class="text-xs text-neutral-500">{{ t('level') }}</span>
          </div>
          <div
            class="
              flex items-center gap-2 rounded-lg bg-white/60 px-3 py-1.5
              dark:bg-neutral-900/40
            "
          >
            <UIcon name="i-heroicons-currency-dollar" class="size-4 text-warning-500" />
            <span class="text-sm font-semibold text-primary-950 dark:text-primary-50">
              {{ summary!.pointsBalance.toLocaleString() }}
            </span>
            <span class="text-xs text-neutral-500">{{ t('points') }}</span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<i18n lang="yaml">
el:
  no_tier: "Καμία βαθμίδα"
  level_display: "Επίπεδο {level}"
  xp_progress: "Πρόοδος XP"
  xp_to_next_tier: "{xp} XP μέχρι την επόμενη βαθμίδα"
  max_tier_reached: "Μέγιστη βαθμίδα!"
  level: "Επίπεδο"
  points: "Πόντοι"
en:
  no_tier: "No tier"
  level_display: "Level {level}"
  xp_progress: "XP Progress"
  xp_to_next_tier: "{xp} XP until next tier"
  max_tier_reached: "Max tier reached!"
  level: "Level"
  points: "Points"
de:
  no_tier: "Keine Stufe"
  level_display: "Level {level}"
  xp_progress: "XP-Fortschritt"
  xp_to_next_tier: "{xp} XP bis zur nächsten Stufe"
  max_tier_reached: "Maximale Stufe erreicht!"
  level: "Level"
  points: "Punkte"
</i18n>
