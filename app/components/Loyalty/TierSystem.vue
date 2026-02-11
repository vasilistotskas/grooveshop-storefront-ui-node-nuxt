<script lang="ts" setup>
const { t, locale } = useI18n()
const loyalty = useLoyalty()

const open = ref(false)

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

const hasTierImage = (tier: LoyaltyTier) => !!(tier.mainImagePath || tier.icon)

const getTierImageUrl = (tier: LoyaltyTier) => {
  return tier.mainImagePath || ''
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

const currentTierName = computed(() => {
  if (!summary.value?.tier) return t('no_tier')
  return getTierName(summary.value.tier)
})

const tierStepperItems = computed(() => {
  if (!tiersWithXpRange.value) return []
  return tiersWithXpRange.value.map((tier: any) => ({
    value: tier.id.toString(),
    title: getTierName(tier),
    description: `${t('level_value', { level: tier.requiredLevel })}+`,
    icon: undefined,
    disabled: !isTierUnlocked(tier),
    tier,
  }))
})

const tierAccordionItems = computed(() => {
  if (!tiersWithXpRange.value) return []
  return tiersWithXpRange.value.map((tier: any) => ({
    value: tier.id.toString(),
    label: getTierName(tier),
    icon: undefined,
    defaultOpen: isCurrentTier(tier),
    tier,
  }))
})

const ready = computed(() => !loading.value && !error.value && tiers.value && tiersWithXpRange.value.length > 0)
</script>

<template>
  <div>
    <!-- Loading State -->
    <USkeleton v-if="loading && !tiers" class="h-24 rounded-xl" />

    <!-- Trigger Card + Slideover -->
    <USlideover
      v-else-if="ready"
      v-model:open="open"
      :title="t('tier_journey')"
      :description="t('slideover_description')"
      side="right"
      :ui="{
        content: 'max-w-lg',
        body: 'space-y-6',
      }"
    >
      <UCard
        class="
          group cursor-pointer transition-all duration-200
          hover:-translate-y-0.5 hover:shadow-lg
        "
        :ui="{
          body: 'sm:p-5',
        }"
        variant="subtle"
      >
        <div class="flex items-center gap-4">
          <div
            class="
              flex size-12 shrink-0 items-center justify-center rounded-xl
              bg-gradient-to-br from-secondary-100 to-secondary-200
              transition-transform duration-200
              group-hover:scale-105
              dark:from-secondary-900 dark:to-secondary-800
            "
          >
            <UIcon
              name="i-heroicons-map"
              class="size-6 text-secondary-700 dark:text-secondary-300"
            />
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-primary-950 dark:text-primary-50">
              {{ t('tier_journey') }}
            </h3>
            <p class="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">
              {{ t('current_tier_label', { tier: currentTierName }) }} &middot; {{ t('view_all_tiers', { count: tiersWithXpRange.length }) }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="
              size-5 text-neutral-400 transition-transform duration-200
              group-hover:translate-x-1
            "
          />
        </div>
      </UCard>

      <template #body>
        <!-- Tier Progression Stepper -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-map" class="size-5 text-primary-600 dark:text-primary-400" />
            <h4 class="font-semibold text-primary-950 dark:text-primary-50">
              {{ t('tier_progression') }}
            </h4>
          </div>

          <UStepper
            v-if="tierStepperItems.length > 0"
            :items="tierStepperItems"
            :model-value="currentTierIndex"
            orientation="vertical"
            color="secondary"
            size="lg"
            class="w-full"
          />
        </div>

        <USeparator />

        <!-- Tier Details Accordion -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-information-circle" class="size-5 text-secondary-600 dark:text-secondary-400" />
            <h4 class="font-semibold text-primary-950 dark:text-primary-50">
              {{ t('tier_details') }}
            </h4>
          </div>

          <UAccordion
            v-if="tierAccordionItems.length > 0"
            :items="tierAccordionItems"
            :default-value="summary?.tier?.id.toString()"
            type="single"
            :collapsible="true"
          >
            <template #default="{ item }">
              <div class="flex items-center gap-3">
                <ImgWithFallback
                  v-if="hasTierImage(item.tier)"
                  :src="getTierImageUrl(item.tier)"
                  :alt="item.label"
                  :width="24"
                  :height="24"
                  fit="contain"
                  :background="'transparent'"
                  class="size-6 shrink-0 object-contain"
                />
                <span class="font-medium">{{ item.label }}</span>
                <UBadge
                  v-if="isCurrentTier(item.tier)"
                  :label="t('current')"
                  color="secondary"
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
                <p class="text-sm text-neutral-700 dark:text-neutral-300">
                  {{ getTierDescription(item.tier) }}
                </p>

                <!-- Requirements -->
                <div class="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900">
                  <h5 class="mb-3 flex items-center gap-2 text-sm font-semibold text-primary-950 dark:text-primary-50">
                    <UIcon name="i-heroicons-key" class="size-4" />
                    {{ t('requirements') }}
                  </h5>
                  <div class="space-y-2 text-sm">
                    <div class="flex items-center justify-between">
                      <span class="text-neutral-600 dark:text-neutral-300">{{ t('required_level') }}</span>
                      <span class="font-semibold">{{ t('level_value', { level: item.tier.requiredLevel }) }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-neutral-600 dark:text-neutral-300">{{ t('min_xp') }}</span>
                      <span class="font-semibold">{{ item.tier.minXp.toLocaleString() }} XP</span>
                    </div>
                    <div v-if="item.tier.maxXp !== null" class="flex items-center justify-between">
                      <span class="text-neutral-600 dark:text-neutral-300">{{ t('max_xp') }}</span>
                      <span class="font-semibold">{{ item.tier.maxXp.toLocaleString() }} XP</span>
                    </div>
                  </div>
                </div>

                <!-- Benefits -->
                <div class="rounded-lg bg-success-50 p-4 dark:bg-success-950">
                  <h5 class="mb-3 flex items-center gap-2 text-sm font-semibold text-primary-950 dark:text-primary-50">
                    <UIcon name="i-heroicons-gift" class="size-4" />
                    {{ t('benefits') }}
                  </h5>
                  <div class="space-y-2">
                    <div class="flex items-start gap-2 text-sm">
                      <UIcon name="i-heroicons-check-circle" class="mt-0.5 size-4 shrink-0 text-success-600 dark:text-success-400" />
                      <span class="text-neutral-700 dark:text-neutral-300">
                        {{ t('points_multiplier', { bonus: getMultiplierBonus(item.tier.pointsMultiplier) }) }}
                      </span>
                    </div>
                    <div v-if="Number(item.tier.pointsMultiplier) > 1" class="flex items-start gap-2 text-sm">
                      <UIcon name="i-heroicons-check-circle" class="mt-0.5 size-4 shrink-0 text-success-600 dark:text-success-400" />
                      <span class="text-neutral-700 dark:text-neutral-300">
                        {{ t('faster_earning') }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </UAccordion>
        </div>

        <USeparator />

        <!-- How It Works -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-question-mark-circle" class="size-5 text-info-600 dark:text-info-400" />
            <h4 class="font-semibold text-primary-950 dark:text-primary-50">
              {{ t('how_it_works_title') }}
            </h4>
          </div>

          <ul class="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            <li class="flex items-start gap-2">
              <UIcon name="i-heroicons-check" class="mt-0.5 size-4 shrink-0 text-primary-600 dark:text-primary-400" />
              <span>{{ t('how_it_works_1', { xp: xpPerLevel.toLocaleString() }) }}</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon name="i-heroicons-check" class="mt-0.5 size-4 shrink-0 text-primary-600 dark:text-primary-400" />
              <span>{{ t('how_it_works_2') }}</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon name="i-heroicons-check" class="mt-0.5 size-4 shrink-0 text-primary-600 dark:text-primary-400" />
              <span>{{ t('how_it_works_3') }}</span>
            </li>
          </ul>

          <!-- Level Formula -->
          <div class="rounded-lg bg-secondary-50 p-4 dark:bg-secondary-950">
            <p class="mb-2 text-sm font-medium text-primary-950 dark:text-primary-50">
              {{ t('formula') }}:
            </p>
            <code class="block rounded bg-neutral-900 p-2 text-xs text-neutral-100 dark:bg-neutral-800">
              Level = 1 + (Total XP / {{ xpPerLevel.toLocaleString() }})
            </code>
            <div class="mt-3 space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
              <div>0 XP = {{ t('level_value', { level: 1 }) }}</div>
              <div>{{ xpPerLevel.toLocaleString() }} XP = {{ t('level_value', { level: 2 }) }}</div>
              <div>{{ (xpPerLevel * 5).toLocaleString() }} XP = {{ t('level_value', { level: 6 }) }}</div>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<i18n lang="yaml">
el:
  no_tier: "Καμία βαθμίδα"
  tier_journey: "Βαθμίδες & Πρόοδος"
  slideover_description: "Δείτε όλες τις βαθμίδες, τις απαιτήσεις και τα οφέλη"
  current_tier_label: "Βαθμίδα: {tier}"
  view_all_tiers: "Δείτε {count} βαθμίδες"
  tier_progression: "Πρόοδος Βαθμίδων"
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
  how_it_works_title: "Πώς Λειτουργεί"
  how_it_works_1: "Κερδίζετε XP με κάθε αγορά ({xp} XP = 1 επίπεδο)"
  how_it_works_2: "Το επίπεδό σας αυξάνεται αυτόματα με το XP"
  how_it_works_3: "Ξεκλειδώνετε νέες βαθμίδες με υψηλότερα επίπεδα"
  formula: "Τύπος"
</i18n>
