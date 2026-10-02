<script lang="ts" setup>
/**
 * The store's rewards programme on a page.
 *
 * A guest sees what joining is worth — what a euro earns, what the
 * points are worth, the welcome bonus, the tier ladder — on the volt
 * card the design draws, with the way in. A signed-in member sees their
 * own points and tier (`LoyaltyProgressHero`) instead: selling the
 * programme to someone already in it is noise.
 *
 * The guest card is the server render, the same for every anonymous
 * visitor and so safe in a cached page. Whether the visitor is a member
 * is not something that cached render can know, so the member's band
 * replaces it only once the page has mounted — rendering it during
 * hydration would differ from the HTML the server sent.
 *
 * Every number comes from the store: the earn and redeem rates and the
 * bonus from its loyalty settings, the ladder from its tiers; the tier
 * multipliers print only where the store turns them on. Nothing renders
 * where the programme is off, and nothing is requested there either.
 */
defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
}>()

const { t, locale } = useI18n()
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()
const tenantStore = useTenantStore()
const { loggedIn } = useUserSession()
const loyalty = useLoyalty()

const offered = tenantStore.loyaltyEnabled
const [{ data: settings }, { data: tiers }] = offered
  ? await Promise.all([loyalty.fetchSettings(), loyalty.fetchTiers()])
  : [{ data: ref<LoyaltySettings>() }, { data: ref<LoyaltyTier[]>() }]

const running = computed(() => offered && !!settings.value?.enabled)

const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
const member = computed(() => mounted.value && loggedIn.value)

const ladder = computed(() => tiers.value ?? [])

/**
 * Up to four tiers in a row on a desk, two on a phone — and fewer
 * columns than four when there are fewer tiers. Literal classes so
 * Tailwind sees them.
 */
const DESK_COLUMNS = ['lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4'] as const
const deskColumns = computed(
  () => DESK_COLUMNS[Math.min(Math.max(ladder.value.length, 1), DESK_COLUMNS.length) - 1],
)

const number = (value: number) => $i18n.n(value, { maximumFractionDigits: 2 })

const headline = computed(() => {
  const factor = settings.value?.pointsFactor ?? 0
  return `${t('earn', { n: number(factor) }, factor === 1 ? 1 : 2)} ${t('redeem', {
    ratio: number(settings.value?.redemptionRatioEur ?? 0),
    amount: $i18n.n(1, { key: 'currency', minimumFractionDigits: 0 }),
  })}`
})

const pitch = computed(() => {
  const lines = [t('join')]
  const bonus = settings.value?.newCustomerBonusPoints ?? 0
  if (settings.value?.newCustomerBonusEnabled && bonus > 0) {
    lines.push(t('bonus', { points: number(bonus) }))
  }
  if (settings.value?.tierMultiplierEnabled) lines.push(t('climb'))
  return lines.join(' ')
})

const tierName = (tier: LoyaltyTier) =>
  extractTranslated(tier, 'name', locale.value) ?? ''

/** What a tier gives: its multiplier where the store runs them, else where it starts. */
const tierTerms = (tier: LoyaltyTier) =>
  settings.value?.tierMultiplierEnabled
    ? t('multiplier', { n: number(Number(tier.pointsMultiplier)) })
    : t('from_level', { level: tier.requiredLevel })
</script>

<template>
  <template v-if="running">
    <PageSectionBand
      v-if="member"
      :heading="title"
      padding="sm"
    >
      <LazyLoyaltyProgressHero />
    </PageSectionBand>

    <section
      v-else
      class="
        py-6
        lg:py-10
      "
    >
      <UContainer>
        <div
          class="
            grid items-center gap-6 rounded-[2rem] bg-volt px-5.5 py-7
            text-on-volt
            lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:p-14
          "
        >
          <div class="flex flex-col items-start gap-4">
            <p class="text-xs font-bold tracking-[0.08em] uppercase">
              {{ t('eyebrow', { store: tenantStore.storeName }) }}
            </p>
            <h2
              class="
                font-display text-[2rem]/none font-bold tracking-[-0.02em]
                text-balance
                lg:text-[3.25rem]/none
              "
            >
              {{ headline }}
            </h2>
            <p class="text-base text-on-volt/80">
              {{ pitch }}
            </p>
            <div class="flex flex-wrap gap-2.5">
              <UButton
                :to="localePath('account-signup')"
                :label="t('cta_join')"
                color="primary"
              />
              <UButton
                :to="localePath('loyalty-program')"
                :label="t('cta_how')"
                color="neutral"
                variant="outline"
                class="
                  bg-transparent text-on-volt ring-on-volt/25
                  hover:bg-on-volt/5 hover:ring-on-volt/40
                  active:bg-on-volt/5
                "
              />
            </div>
          </div>

          <!-- The ladder, top tier last and in ink: the one to aim for. -->
          <ol
            v-if="ladder.length"
            class="grid grid-cols-2 gap-3"
            :class="deskColumns"
          >
            <li
              v-for="(tier, index) in ladder"
              :key="tier.id"
              class="
                flex flex-col gap-4.5 rounded-[1.25rem] p-3.5
                lg:gap-10 lg:p-5.5
              "
              :class="index === ladder.length - 1 ? 'bg-on-volt text-white' : 'bg-white/70 text-on-volt'"
            >
              <UIcon
                name="i-heroicons-trophy"
                class="
                  size-5
                  lg:size-6
                "
              />
              <div>
                <p
                  class="
                    text-[0.9375rem] font-extrabold
                    lg:text-lg
                  "
                >
                  {{ tierName(tier) }}
                </p>
                <p class="font-mono text-[0.8125rem] tabular-nums opacity-80">
                  {{ tierTerms(tier) }}
                </p>
              </div>
            </li>
          </ol>
        </div>
      </UContainer>
    </section>
  </template>
</template>

<i18n lang="yaml">
el:
  eyebrow: 'Επιβράβευση {store}'
  earn: '{n} πόντος για κάθε ευρώ. | {n} πόντοι για κάθε ευρώ.'
  redeem: '{ratio} πόντοι = {amount}.'
  join: Γίνε μέλος δωρεάν και εξαργύρωσε τους πόντους σου στο ταμείο.
  bonus: 'Με την πρώτη σου παραγγελία παίρνεις {points} πόντους καλωσορίσματος.'
  climb: Ανέβαινε βαθμίδες για να κερδίζεις πιο γρήγορα.
  cta_join: Γίνε μέλος δωρεάν
  cta_how: Πώς λειτουργεί
  multiplier: '×{n} πόντοι'
  from_level: 'Από το επίπεδο {level}'
en:
  eyebrow: '{store} Rewards'
  earn: '{n} point for every euro. | {n} points for every euro.'
  redeem: '{ratio} points = {amount}.'
  join: Join free and redeem your points at checkout.
  bonus: 'Your first order earns a {points}-point welcome bonus.'
  climb: Climb tiers to earn faster.
  cta_join: Join free
  cta_how: How it works
  multiplier: '×{n} points'
  from_level: 'From level {level}'
</i18n>
