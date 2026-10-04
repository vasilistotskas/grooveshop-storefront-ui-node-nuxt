<script lang="ts" setup>
/**
 * The account's rewards at a glance, as the board draws them: the
 * spendable balance on a volt card, beside the tier ladder with the
 * shopper's place on it and what is left to the next tier.
 *
 * Tiers are whatever the API returns, in any number, with the
 * thresholds `tierStartXp` derives from the store's XP per level — lifetime
 * points, never a rolling window. Where the shopper stands is said only
 * when the ladder establishes it: an empty ladder, or one without their
 * tier, shows no ladder rather than a "top tier" it cannot know. A
 * multiplier is quoted only while the store has tier multipliers on, and
 * the balance's worth only while the programme is on — a settings read
 * that failed falls back to defaults whose ratio the store never set.
 */
const { t, n, locale } = useI18n()
const loyalty = useLoyalty()

const { data: summary, status, error, refresh } = loyalty.fetchSummary()
const { data: tiers } = loyalty.fetchTiers()
const { data: settings } = loyalty.fetchSettings()

const loading = computed(() => status.value === 'pending')

const headingId = useId()

const xpPerLevel = computed(() => settings.value?.xpPerLevel ?? defaultLoyaltySettings().xpPerLevel)

// The tiers in the order a shopper climbs them.
const ladder = computed(() => [...(tiers.value ?? [])].sort((a, b) => a.requiredLevel - b.requiredLevel))

// The shopper's rung on that ladder, -1 without a tier (or one the
// ladder does not hold).
const currentRank = computed(() => {
  const currentId = summary.value?.tier?.id
  return currentId ? ladder.value.findIndex(tier => tier.id === currentId) : -1
})

/** The tier after the shopper's; `null` at the top; `undefined` when the ladder cannot say. */
const nextTier = computed<LoyaltyTier | null | undefined>(() => {
  if (!ladder.value.length) return undefined
  if (summary.value?.tier && currentRank.value === -1) return undefined
  return ladder.value[currentRank.value + 1] ?? null
})

const toNext = computed(() => {
  const value = summary.value
  const next = nextTier.value
  if (!value || !next) return 0
  return Math.max(0, tierStartXp(next, xpPerLevel.value) - value.totalXp)
})

const nextMultiplier = computed(() => {
  const multiplier = Number(nextTier.value?.pointsMultiplier)
  return settings.value?.tierMultiplierEnabled && Number.isFinite(multiplier) && multiplier > 1 ? multiplier : null
})

const worth = computed(() => {
  const ratio = settings.value?.enabled ? settings.value.redemptionRatioEur : undefined
  const value = summary.value
  return value && ratio && ratio > 0 ? n(value.pointsBalance / ratio, 'currency') : null
})

const tierName = (tier: LoyaltyTier) => extractTranslated(tier, 'name', locale.value) ?? ''
</script>

<template>
  <div
    v-if="loading"
    class="grid gap-4 lg:grid-cols-2"
  >
    <USkeleton class="h-44 rounded-[1.25rem]" />
    <USkeleton class="h-44 rounded-[1.25rem]" />
  </div>

  <AccountLoadError
    v-else-if="error"
    :message="t('error_loading')"
    @retry="() => refresh()"
  />

  <div
    v-else-if="summary"
    class="grid gap-4"
    :class="ladder.length ? 'lg:grid-cols-[11fr_10fr]' : ''"
  >
    <section
      :aria-label="t('balance')"
      class="
        flex flex-col justify-between gap-6 rounded-[1.25rem] bg-volt p-6
        text-on-volt
      "
    >
      <p class="text-xs font-semibold tracking-wider uppercase">
        {{ t('balance') }}
      </p>
      <p class="font-mono text-[3.5rem]/none font-bold tracking-tight">
        {{ n(summary.pointsBalance) }}
      </p>
      <p
        v-if="worth"
        class="text-sm"
      >
        {{ t('worth', { amount: worth }) }}
      </p>
    </section>

    <section
      v-if="ladder.length"
      :aria-labelledby="headingId"
      class="
        flex flex-col gap-5 rounded-[1.25rem] bg-default p-6 ring ring-default
      "
    >
      <h2
        :id="headingId"
        class="text-xs font-semibold tracking-wider text-muted uppercase"
      >
        {{ t('tier_progress') }}
      </h2>

      <ol
        class="grid gap-x-2"
        :style="{ gridTemplateColumns: `repeat(${ladder.length}, minmax(0, 1fr))` }"
      >
        <li
          v-for="(tier, index) in ladder"
          :key="tier.id"
          :aria-current="index === currentRank ? 'step' : undefined"
          class="flex min-w-0 flex-col gap-1"
        >
          <span
            class="mb-2 h-1.5 rounded-full"
            :class="index <= currentRank ? 'bg-secondary' : 'bg-accented'"
          />
          <span class="truncate text-sm font-semibold text-highlighted">
            {{ tierName(tier) }}
            <span
              v-if="index === currentRank"
              class="sr-only"
            >({{ t('current') }})</span>
          </span>
          <span class="font-mono text-xs text-muted">
            {{ n(tierStartXp(tier, xpPerLevel)) }}
          </span>
        </li>
      </ol>

      <p
        v-if="nextTier !== undefined"
        class="text-sm text-toned"
      >
        <template v-if="nextTier && nextMultiplier">
          {{ t('earn_more_multiplier', { points: n(toNext), tier: tierName(nextTier), multiplier: n(nextMultiplier) }) }}
        </template>
        <template v-else-if="nextTier">
          {{ t('earn_more', { points: n(toNext), tier: tierName(nextTier) }) }}
        </template>
        <template v-else>
          {{ t('top_tier') }}
        </template>
      </p>

      <LoyaltyTierSystem />
    </section>
  </div>
</template>

<i18n lang="yaml">
el:
  balance: Υπόλοιπο
  worth: "= {amount} για να ξοδέψεις στο ταμείο"
  tier_progress: Πρόοδος βαθμίδας
  current: τρέχουσα βαθμίδα
  earn_more: Κέρδισε άλλους {points} πόντους για τη βαθμίδα {tier}.
  earn_more_multiplier: Κέρδισε άλλους {points} πόντους για τη βαθμίδα {tier} (×{multiplier}).
  top_tier: Είσαι στην κορυφαία βαθμίδα.
  error_loading: Δεν μπορέσαμε να φορτώσουμε τους πόντους σου.
en:
  balance: Balance
  worth: "= {amount} to spend at checkout"
  tier_progress: Tier progress
  current: current tier
  earn_more: Earn {points} more points to reach {tier}.
  earn_more_multiplier: Earn {points} more points to reach {tier} (×{multiplier}).
  top_tier: You are on the top tier.
  error_loading: We could not load your points.
</i18n>
