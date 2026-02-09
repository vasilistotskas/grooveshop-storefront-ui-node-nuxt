<script lang="ts" setup>
/**
 * Loyalty Progress Hero Component
 *
 * Displays the user's current loyalty progress in a hero card format.
 * Shows tier icon, level, XP progress bar, and quick stats.
 */

interface Props {
  summary: LoyaltySummary
  currentTierIcon: string
  currentTierName: string
  xpProgress: number
  nextTierXp: number
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <UCard>
    <div class="space-y-6 text-center">
      <!-- Tier Icon with Level Badge -->
      <div class="flex justify-center">
        <div class="relative">
          <div class="flex size-24 items-center justify-center rounded-full bg-linear-to-br from-primary-500 to-secondary-500">
            <UIcon :name="currentTierIcon" class="size-12 text-white" />
          </div>
          <UBadge
            :label="t('level_badge', { level: summary.level })"
            color="primary"
            size="lg"
            class="absolute -bottom-2 left-1/2 -translate-x-1/2"
          />
        </div>
      </div>

      <!-- Tier Name -->
      <div>
        <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {{ currentTierName }}
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ t('your_current_tier') }}
        </p>
      </div>

      <!-- XP Progress Bar -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('xp_progress') }}</span>
          <span class="font-bold text-primary-800 dark:text-primary-200">
            {{ summary.totalXp.toLocaleString() }} / {{ nextTierXp.toLocaleString() }} XP
          </span>
        </div>
        <UProgress
          :model-value="xpProgress"
          :max="100"
          size="xl"
          color="primary"
          :status="true"
        >
          <template #status="{ percent }">
            <span class="text-xs font-medium">{{ Math.round(percent || 0) }}%</span>
          </template>
        </UProgress>
        <p v-if="summary.pointsToNextTier !== null" class="text-xs text-gray-600 dark:text-gray-400">
          {{ t('xp_to_next_tier', { xp: summary.pointsToNextTier.toLocaleString() }) }}
        </p>
        <p v-else class="text-xs font-semibold text-success-600 dark:text-success-400">
          {{ t('max_tier_reached') }}
        </p>
      </div>

      <!-- Quick Stats Grid -->
      <div class="grid grid-cols-3 gap-4">
        <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
          <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {{ summary.level }}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">
            {{ t('level') }}
          </div>
        </div>
        <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
          <div class="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
            {{ summary.pointsBalance.toLocaleString() }}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">
            {{ t('points') }}
          </div>
        </div>
        <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
          <div class="text-2xl font-bold text-success-600 dark:text-success-400">
            {{ summary.totalXp.toLocaleString() }}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">
            {{ t('total_xp') }}
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<i18n lang="yaml">
el:
  level_badge: "Επίπεδο {level}"
  your_current_tier: "Η τρέχουσα βαθμίδα σας"
  xp_progress: "Πρόοδος XP"
  xp_to_next_tier: "{xp} XP μέχρι την επόμενη βαθμίδα"
  max_tier_reached: "Έχετε φτάσει τη μέγιστη βαθμίδα!"
  level: "Επίπεδο"
  points: "Πόντοι"
  total_xp: "Συνολικό XP"
en:
  level_badge: "Level {level}"
  your_current_tier: "Your current tier"
  xp_progress: "XP Progress"
  xp_to_next_tier: "{xp} XP until next tier"
  max_tier_reached: "You've reached the maximum tier!"
  level: "Level"
  points: "Points"
  total_xp: "Total XP"
de:
  level_badge: "Level {level}"
  your_current_tier: "Ihre aktuelle Stufe"
  xp_progress: "XP-Fortschritt"
  xp_to_next_tier: "{xp} XP bis zur nächsten Stufe"
  max_tier_reached: "Sie haben die maximale Stufe erreicht!"
  level: "Level"
  points: "Punkte"
  total_xp: "Gesamt-XP"
</i18n>
