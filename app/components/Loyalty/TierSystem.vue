<script lang="ts" setup>
/**
 * Every tier the store has, in a slideover opened from the tier card:
 * where each starts (lifetime points, `tierStartXp`), where the shopper
 * stands on the ladder, and what the merchant wrote for the tier.
 *
 * The benefits are the tier's own `description` and nothing else; a
 * multiplier is listed only while the store has tier multipliers on.
 * Shows nothing until the ladder is known, and nothing for an empty one.
 */
const { t, n, locale } = useI18n()
const localePath = useLocalePath()
const loyalty = useLoyalty()

const { data: summary } = loyalty.fetchSummary()
const { data: tiers } = loyalty.fetchTiers()
const { data: settings } = loyalty.fetchSettings()

const xpPerLevel = computed(() => settings.value?.xpPerLevel ?? defaultLoyaltySettings().xpPerLevel)

const ladder = computed(() => [...(tiers.value ?? [])].sort((a, b) => a.requiredLevel - b.requiredLevel))

const currentRank = computed(() => {
  const currentId = summary.value?.tier?.id
  return currentId ? ladder.value.findIndex(tier => tier.id === currentId) : -1
})

const rows = computed(() => ladder.value.map((tier, index) => {
  const multiplier = Number(tier.pointsMultiplier)
  return {
    id: tier.id,
    name: extractTranslated(tier, 'name', locale.value) ?? '',
    description: extractTranslated(tier, 'description', locale.value) ?? '',
    from: n(tierStartXp(tier, xpPerLevel.value)),
    multiplier: settings.value?.tierMultiplierEnabled && Number.isFinite(multiplier) && multiplier > 1 ? n(multiplier) : null,
    status: index === currentRank.value ? 'current' : index < currentRank.value ? 'unlocked' : 'locked',
  } as const
}))

const STATUS_BADGES = {
  current: { color: 'neutral', variant: 'solid' },
  unlocked: { color: 'success', variant: 'soft' },
  locked: { color: 'neutral', variant: 'soft' },
} as const
</script>

<template>
  <USlideover
    v-if="rows.length"
    :title="t('title')"
    :description="t('description')"
    side="right"
    :ui="{ content: 'max-w-lg', body: 'flex flex-col gap-3' }"
  >
    <UButton
      :label="t('open')"
      color="neutral"
      variant="outline"
      size="sm"
      class="self-start"
    />

    <template #body>
      <ul class="flex flex-col gap-3">
        <li
          v-for="row in rows"
          :key="row.id"
          class="flex flex-col gap-2 rounded-xl bg-elevated p-4"
        >
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-semibold text-highlighted">
              {{ row.name }}
            </h3>
            <UBadge
              :label="t(row.status)"
              :color="STATUS_BADGES[row.status].color"
              :variant="STATUS_BADGES[row.status].variant"
              size="sm"
            />
            <UBadge
              v-if="row.multiplier"
              :label="t('multiplier', { multiplier: row.multiplier })"
              color="neutral"
              variant="outline"
              size="sm"
            />
          </div>
          <p class="text-sm text-toned">
            {{ t('from') }}
            <span class="font-mono font-semibold text-highlighted">{{ row.from }}</span>
          </p>
          <p
            v-if="row.description"
            class="text-sm text-toned"
          >
            {{ row.description }}
          </p>
        </li>
      </ul>
    </template>

    <template #footer>
      <UButton
        :label="t('how_it_works')"
        :to="localePath('loyalty-program')"
        trailing-icon="i-lucide-arrow-right"
        color="neutral"
        variant="link"
      />
    </template>
  </USlideover>
</template>

<i18n lang="yaml">
el:
  open: Λεπτομέρειες βαθμίδων
  title: Βαθμίδες
  description: Κάθε βαθμίδα, από πότε ισχύει και τι προσφέρει.
  from: "Από (συνολικοί πόντοι):"
  current: Τρέχουσα
  unlocked: Ξεκλειδωμένη
  locked: Κλειδωμένη
  multiplier: "×{multiplier} πόντοι"
  how_it_works: Πώς λειτουργεί το πρόγραμμα
en:
  open: Tier details
  title: Tiers
  description: Every tier, where it starts and what it gives.
  from: "From (lifetime points):"
  current: Current
  unlocked: Unlocked
  locked: Locked
  multiplier: "×{multiplier} points"
  how_it_works: How the programme works
</i18n>
