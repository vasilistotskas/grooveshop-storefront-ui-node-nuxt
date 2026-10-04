<script lang="ts" setup>
/**
 * One tier of the programme's ladder, as the public page draws it: where
 * it starts in lifetime points, its name, what it multiplies (only where
 * the store turns multipliers on) and what the merchant wrote for it.
 *
 * The perks are the tier's own `description`, one per line, and nothing
 * else: a tier without a description has no list rather than an invented
 * one. The top tier is `featured` — in ink, the one to aim for.
 */
const props = defineProps<{
  tier: LoyaltyTier
  /** Lifetime points per level, from the store's settings. */
  xpPerLevel: number
  /** Whether the store runs tier multipliers. */
  showMultiplier: boolean
  featured?: boolean
}>()

const { t, n, locale } = useI18n()

const name = computed(() => extractTranslated(props.tier, 'name', locale.value) ?? '')

const threshold = computed(() => tierStartXp(props.tier, props.xpPerLevel))

const perks = computed(() =>
  (extractTranslated(props.tier, 'description', locale.value) ?? '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean),
)

const multiplier = computed(() => {
  const value = Number(props.tier.pointsMultiplier)
  return props.showMultiplier && Number.isFinite(value) ? n(value) : null
})
</script>

<template>
  <li
    class="flex flex-col gap-5 rounded-[1.25rem] p-5 ring ring-default"
    :class="featured ? 'bg-inverted text-inverted ring-0' : 'bg-default'"
  >
    <div class="flex items-center justify-between gap-3">
      <UIcon
        name="i-lucide-trophy"
        class="size-5"
      />
      <span
        class="rounded-full px-2.5 py-1 font-mono text-xs font-semibold"
        :class="featured ? 'bg-volt text-on-volt' : 'bg-elevated text-toned'"
      >
        {{ threshold > 0 ? t('points', { points: n(threshold) }) : t('from_zero') }}
      </span>
    </div>

    <div class="flex flex-col gap-1">
      <h3
        v-if="name"
        class="font-display text-2xl font-bold"
      >
        {{ name }}
      </h3>
      <p
        v-if="multiplier"
        class="font-mono text-sm font-semibold"
        :class="featured ? 'text-(--ui-volt-on-inverted)' : 'text-accent'"
      >
        {{ t('multiplier', { n: multiplier }) }}
      </p>
    </div>

    <ul
      v-if="perks.length"
      class="flex flex-col gap-2 text-sm"
    >
      <li
        v-for="perk in perks"
        :key="perk"
        class="flex items-start gap-2"
      >
        <UIcon
          name="i-lucide-check"
          class="mt-0.5 size-4 shrink-0"
        />
        {{ perk }}
      </li>
    </ul>
  </li>
</template>

<i18n lang="yaml">
el:
  points: "{points} πόντοι"
  from_zero: Από 0
  multiplier: "×{n} πόντοι"
en:
  points: "{points} points"
  from_zero: From 0
  multiplier: "×{n} points"
</i18n>
