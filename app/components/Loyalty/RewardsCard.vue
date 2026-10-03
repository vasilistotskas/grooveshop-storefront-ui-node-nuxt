<script lang="ts" setup>
/**
 * The shopper's rewards at a glance, the account overview's volt card:
 * the spendable balance, what it is worth at checkout, and how far they
 * are from the next tier.
 *
 * Tiers are XP levels (`tierStartXp`): progress and the distance left
 * are in XP, which is what earns a tier, not in spendable points.
 */
const { t, n, locale } = useI18n()
const localePath = useLocalePath()
const loyalty = useLoyalty()

const { data: summary } = await loyalty.fetchSummary()
const { data: tiers } = await loyalty.fetchTiers()
const { data: settings } = loyalty.fetchSettings()

const xpPerLevel = computed(() => settings.value?.xpPerLevel ?? defaultLoyaltySettings().xpPerLevel)

const ladder = computed(() => [...(tiers.value ?? [])].sort((a, b) => a.requiredLevel - b.requiredLevel))

const currentTier = computed(() => summary.value?.tier ?? null)

const nextTier = computed(() => {
  const current = currentTier.value
  if (!current) return ladder.value[0]
  const index = ladder.value.findIndex(tier => tier.id === current.id)
  return index === -1 ? undefined : ladder.value[index + 1]
})

const progress = computed(() => {
  const value = summary.value
  const next = nextTier.value
  if (!value || !next) return 100
  const from = currentTier.value ? tierStartXp(currentTier.value, xpPerLevel.value) : 0
  return tierProgress(value.totalXp, from, tierStartXp(next, xpPerLevel.value))
})

const xpToNext = computed(() => {
  const value = summary.value
  const next = nextTier.value
  if (!value || !next) return 0
  return Math.max(0, tierStartXp(next, xpPerLevel.value) - value.totalXp)
})

const worth = computed(() => {
  const ratio = settings.value?.redemptionRatioEur
  const value = summary.value
  return value && ratio && ratio > 0 ? n(value.pointsBalance / ratio, 'currency') : null
})

const tierName = (tier: LoyaltyTier) => extractTranslated(tier, 'name', locale.value) ?? ''
</script>

<template>
  <ULink
    v-if="summary"
    :to="localePath('account-loyalty')"
    raw
    class="
      flex flex-col gap-4 rounded-[1.25rem] bg-volt p-6 text-on-volt
      transition-shadow
      hover:shadow-md
    "
  >
    <div class="flex items-center justify-between gap-3">
      <p class="font-semibold">
        {{ t('title') }}
      </p>
      <UBadge
        v-if="currentTier"
        :label="tierName(currentTier)"
        class="bg-inverted text-inverted ring-0"
      />
    </div>
    <p class="font-mono text-[2.75rem]/none font-bold tracking-tight">
      {{ t('points', { points: n(summary.pointsBalance) }, summary.pointsBalance) }}
    </p>
    <p
      v-if="worth"
      class="text-sm"
    >
      {{ t('worth', { amount: worth }) }}
    </p>
    <div
      class="h-2 overflow-hidden rounded-full bg-on-volt/15"
      role="progressbar"
      :aria-label="t('progress_label')"
      :aria-valuenow="Math.round(progress)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="h-full rounded-full bg-on-volt"
        :style="{ width: `${progress}%` }"
      />
    </div>
    <p class="text-sm font-medium">
      <template v-if="nextTier">
        {{ t('to_next', { xp: n(xpToNext), tier: tierName(nextTier) }) }}
      </template>
      <template v-else>
        {{ t('top_tier') }}
      </template>
    </p>
  </ULink>
</template>

<i18n lang="yaml">
el:
  title: Επιβράβευση
  points: "{points} πόντος | {points} πόντοι"
  worth: Αξίζουν {amount} στο ταμείο
  progress_label: Πρόοδος ως την επόμενη βαθμίδα
  to_next: "{xp} XP ως τη βαθμίδα {tier}"
  top_tier: Είσαι στην κορυφαία βαθμίδα
en:
  title: Rewards
  points: "{points} pt | {points} pts"
  worth: Worth {amount} at checkout
  progress_label: Progress to the next tier
  to_next: "{xp} XP to {tier}"
  top_tier: You are at the top tier
</i18n>
