<script lang="ts" setup>
/**
 * The store's rewards programme, as the design draws it: a volt hero
 * with a worked example, four short steps, the tier ladder and the
 * questions people ask.
 *
 * Every number is the store's own: the earn and redeem rates and the
 * welcome bonus from its loyalty settings, the ladder from its tiers — in
 * any number, with the thresholds `tierStartXp` derives (lifetime points,
 * never a rolling window). A multiplier prints only where the store turns
 * multipliers on, a perk only where the merchant wrote the tier a
 * description, and a step the store cannot back (no redemption, no
 * ladder) is left out rather than invented.
 *
 * The page is cached for everyone, so it renders the guest's way in; a
 * signed-in member's own buttons replace it once the page has mounted.
 */
const { t, n, locale } = useI18n()
const localePath = useLocalePath()
const { loggedIn } = useUserSession()
const loyalty = useLoyalty()

const [{ data: settings }, { data: tiers }] = await Promise.all([
  loyalty.fetchSettings(),
  loyalty.fetchTiers(),
])

const EXAMPLE_ORDER_EUR = 100

// The hero is volt in both colour schemes, so its breadcrumb is ink too.
const BREADCRUMB_UI = { link: 'text-on-volt', linkLabel: 'text-on-volt', separatorIcon: 'text-on-volt' }

const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
const member = computed(() => mounted.value && loggedIn.value)

const ladder = computed(() => [...(tiers.value ?? [])].sort((a, b) => a.requiredLevel - b.requiredLevel))

const xpPerLevel = computed(() => settings.value?.xpPerLevel ?? defaultLoyaltySettings().xpPerLevel)

const multipliers = computed(() => !!settings.value?.tierMultiplierEnabled && ladder.value.length > 1)

// A ratio of 0 redeems nothing: the page then says nothing about spending.
const ratio = computed(() => {
  const value = settings.value?.redemptionRatioEur
  return value && value > 0 ? value : null
})

const factor = computed(() => settings.value?.pointsFactor ?? 0)

const bonus = computed(() => {
  const points = settings.value?.newCustomerBonusPoints ?? 0
  return settings.value?.newCustomerBonusEnabled && points > 0 ? points : null
})

const euro = (value: number) => n(value, { key: 'currency', minimumFractionDigits: 0 })

const tierName = (tier: LoyaltyTier) => extractTranslated(tier, 'name', locale.value) ?? ''

const lead = computed(() => [
  factor.value > 0 ? t('lead.earn', { n: n(factor.value, { maximumFractionDigits: 2 }) }, factor.value === 1 ? 1 : 2) : '',
  multipliers.value ? t('lead.climb') : '',
  ratio.value ? t('lead.spend', { ratio: n(ratio.value), amount: euro(1) }) : '',
].filter(Boolean).join(' '))

// What a 100 € order earns at the base rate, and what that is worth.
const example = computed(() => {
  if (factor.value <= 0) return null
  const points = EXAMPLE_ORDER_EUR * factor.value
  const topTier = ladder.value.at(-1)
  const top = multipliers.value && topTier ? Number(topTier.pointsMultiplier) : 0
  return {
    order: euro(EXAMPLE_ORDER_EUR),
    points: n(points, { maximumFractionDigits: 0 }),
    worth: ratio.value ? n(points / ratio.value, 'currency') : null,
    top: top > 1 ? { tier: tierName(topTier!), multiplier: n(top) } : null,
  }
})

const steps = computed(() => {
  const list = [
    {
      key: 'join',
      icon: 'i-lucide-user',
      text: bonus.value ? t('steps.join.text_bonus', { points: n(bonus.value) }) : t('steps.join.text'),
    },
    {
      key: 'earn',
      icon: 'i-lucide-shopping-bag',
      text: [
        t('steps.earn.text', { n: n(factor.value, { maximumFractionDigits: 2 }) }, factor.value === 1 ? 1 : 2),
        multipliers.value ? t('steps.earn.tier') : '',
      ].filter(Boolean).join(' '),
    },
  ]
  if (ladder.value.length > 1) {
    const rungs = ladder.value.slice(1).map(tier => t('steps.climb.rung', { name: tierName(tier), points: n(tierStartXp(tier, xpPerLevel.value)) }))
    list.push({
      key: 'climb',
      icon: 'i-lucide-trophy',
      text: t('steps.climb.text', { rungs: new Intl.ListFormat(locale.value, { type: 'conjunction' }).format(rungs) }),
    })
  }
  if (ratio.value) {
    list.push({
      key: 'spend',
      icon: 'i-lucide-tag',
      text: t('steps.spend.text', { ratio: n(ratio.value), amount: euro(1) }),
    })
  }
  return list
})

const faq = computed(() => {
  const days = settings.value?.pointsExpirationDays ?? 0
  return [
    {
      label: t('faq.expire.question'),
      content: days > 0 ? t('faq.expire.answer_days', { days }) : t('faq.expire.answer_never'),
    },
    { label: t('faq.combine.question'), content: t('faq.combine.answer') },
    { label: t('faq.balance.question'), content: t('faq.balance.answer') },
    { label: t('faq.return.question'), content: t('faq.return.answer') },
    { label: t('faq.signup.question'), content: t('faq.signup.answer') },
  ]
})

const breadcrumb = computed(() => [
  { label: t('breadcrumb.home'), to: localePath('index') },
  { label: t('title'), to: localePath('loyalty-program') },
])

useSeoMeta({
  titleTemplate: '%s',
  title: t('title'),
  description: t('meta_description'),
})

useHead({
  titleTemplate: '%s',
  title: t('title'),
})
</script>

<template>
  <div class="flex flex-col">
    <section
      class="
        py-6
        lg:py-10
      "
    >
      <UContainer>
        <div
          class="
            grid items-center gap-8 rounded-[2rem] bg-volt px-5.5 py-7
            text-on-volt
            lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:p-14
          "
        >
          <div class="flex flex-col items-start gap-5">
            <UBreadcrumb
              :items="breadcrumb"
              :ui="BREADCRUMB_UI"
            />
            <h1
              class="
                font-display text-[2.5rem]/none font-bold tracking-[-0.02em]
                text-balance
                lg:text-[4rem]/none
              "
            >
              {{ t('headline') }}
            </h1>
            <p class="max-w-prose text-base text-on-volt/80">
              {{ lead }}
            </p>
            <!-- Ink in both colour schemes: the volt card does not change
                 with the mode, so the theme's primary (which turns light
                 in dark mode) would vanish into it. -->
            <div class="flex flex-wrap gap-2.5">
              <template v-if="member">
                <UButton
                  :to="localePath('products')"
                  :label="t('cta.shop')"
                  color="neutral"
                  class="
                    bg-on-volt text-white
                    hover:bg-on-volt/90
                    active:bg-on-volt/90
                  "
                />
                <UButton
                  :to="localePath('account-loyalty')"
                  :label="t('cta.points')"
                  color="neutral"
                  variant="outline"
                  class="
                    bg-transparent text-on-volt ring-on-volt/25
                    hover:bg-on-volt/5 hover:ring-on-volt/40
                    active:bg-on-volt/5
                  "
                />
              </template>
              <template v-else>
                <UButton
                  :to="localePath('account-signup')"
                  :label="t('cta.join')"
                  color="neutral"
                  class="
                    bg-on-volt text-white
                    hover:bg-on-volt/90
                    active:bg-on-volt/90
                  "
                />
                <UButton
                  :to="localePath('account-login')"
                  :label="t('cta.sign_in')"
                  color="neutral"
                  variant="outline"
                  class="
                    bg-transparent text-on-volt ring-on-volt/25
                    hover:bg-on-volt/5 hover:ring-on-volt/40
                    active:bg-on-volt/5
                  "
                />
              </template>
            </div>
          </div>

          <div
            v-if="example"
            class="flex flex-col gap-3 rounded-[1.25rem] bg-default p-6 text-default"
          >
            <p class="text-xs font-semibold tracking-wider text-muted uppercase">
              {{ t('example.eyebrow') }}
            </p>
            <p class="text-sm text-toned">
              {{ t('example.order', { amount: example.order }) }}
            </p>
            <p class="font-mono text-[3rem]/none font-bold tracking-tight text-highlighted">
              {{ t('example.points', { points: example.points }) }}
            </p>
            <p
              v-if="example.worth"
              class="text-sm text-toned"
            >
              {{ t('example.worth', { amount: example.worth }) }}
            </p>
            <p
              v-if="example.top"
              class="text-sm text-toned"
            >
              {{ t('example.top', { tier: example.top.tier, multiplier: example.top.multiplier }) }}
            </p>
          </div>
        </div>
      </UContainer>
    </section>

    <PageSectionBand
      surface="muted"
      :heading="t('how.title')"
    >
      <ol
        :aria-label="t('how.title')"
        class="grid gap-8 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr"
      >
        <li
          v-for="(step, index) in steps"
          :key="step.key"
          class="flex flex-col gap-3"
        >
          <div class="flex items-center gap-3">
            <span class="font-mono text-sm font-semibold text-accent">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <span
              class="h-px flex-1 bg-accented"
              aria-hidden="true"
            />
            <UIcon
              :name="step.icon"
              class="size-5 text-toned"
            />
          </div>
          <h3 class="font-display text-xl font-bold text-highlighted">
            {{ t(`steps.${step.key}.title`) }}
          </h3>
          <p class="text-sm text-toned">
            {{ step.text }}
          </p>
        </li>
      </ol>
    </PageSectionBand>

    <PageSectionBand
      v-if="ladder.length"
      :heading="t('tiers.title')"
      :subheading="t('tiers.lead')"
    >
      <ol
        :aria-label="t('tiers.title')"
        class="grid gap-4 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr"
      >
        <LoyaltyTierCard
          v-for="(tier, index) in ladder"
          :key="tier.id"
          :tier="tier"
          :xp-per-level="xpPerLevel"
          :show-multiplier="!!settings?.tierMultiplierEnabled"
          :featured="ladder.length > 1 && index === ladder.length - 1"
        />
      </ol>
    </PageSectionBand>

    <PageSectionBand surface="muted">
      <div
        class="
          grid gap-8
          lg:grid-cols-[1fr_2fr]
        "
      >
        <h2
          class="
            font-display text-3xl/tight font-bold text-highlighted
            lg:text-[2.5rem]/tight
          "
        >
          {{ t('faq.title') }}
        </h2>
        <UAccordion
          :items="faq"
          type="single"
          collapsible
          :ui="{
            item: `
              border-t border-b-0 border-default
              last:border-b
            `,
            trigger: 'py-5 text-[1.0625rem] font-bold text-highlighted',
            body: 'pb-5 text-sm text-toned',
          }"
        />
      </div>
    </PageSectionBand>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Πρόγραμμα επιβράβευσης
  meta_description: Δες πώς λειτουργεί το πρόγραμμα επιβράβευσης. Κέρδισε πόντους σε κάθε αγορά και εξαργύρωσέ τους σε εκπτώσεις.
  breadcrumb:
    home: Αρχική
  headline: Κάθε ευρώ σου κερδίζει πόντους.
  lead:
    earn: "Η επιβράβευση είναι δωρεάν: κερδίζεις {n} πόντο για κάθε ευρώ. | Η επιβράβευση είναι δωρεάν: κερδίζεις {n} πόντους για κάθε ευρώ."
    climb: Ανέβαινε βαθμίδες για να κερδίζεις πιο γρήγορα.
    spend: "Ξόδεψέ τους στο ταμείο: {ratio} πόντοι = {amount}."
  cta:
    join: Γίνε μέλος δωρεάν
    sign_in: Σύνδεση
    shop: Στο κατάστημα
    points: Δες τους πόντους σου
  example:
    eyebrow: Παράδειγμα
    order: "Μια παραγγελία {amount} κερδίζει"
    points: "{points} πόντους"
    worth: "Αξίζουν {amount} στο ταμείο"
    top: "Στη βαθμίδα {tier} οι πόντοι πολλαπλασιάζονται ×{multiplier}"
  how:
    title: Πώς λειτουργεί
  steps:
    join:
      title: Εγγραφή
      text: Φτιάξε δωρεάν λογαριασμό.
      text_bonus: "Φτιάξε δωρεάν λογαριασμό. Η πρώτη σου παραγγελία κερδίζει {points} πόντους καλωσορίσματος."
    earn:
      title: Κέρδος
      text: "{n} πόντος για κάθε ευρώ που ξοδεύεις. | {n} πόντοι για κάθε ευρώ που ξοδεύεις."
      tier: Πολλαπλασιάζεται με τη βαθμίδα σου.
    climb:
      title: Άνοδος
      rung: "{name} στους {points}"
      text: "{rungs} πόντους."
    spend:
      title: Εξαργύρωση
      text: "Χρησιμοποίησε πόντους στο ταμείο. {ratio} πόντοι = {amount}."
  tiers:
    title: Βαθμίδες
    lead: Η βαθμίδα σου βασίζεται σε όλους τους πόντους που έχεις κερδίσει ποτέ.
  faq:
    title: Ερωτήσεις
    expire:
      question: Λήγουν οι πόντοι μου;
      answer_never: Όχι. Οι πόντοι δεν λήγουν όσο ο λογαριασμός σου παραμένει ενεργός.
      answer_days: "Οι πόντοι λήγουν {days} ημέρες μετά την παραγγελία που τους κέρδισε. Το υπόλοιπο και το ιστορικό σου φαίνονται στον λογαριασμό σου."
    combine:
      question: Μπορώ να χρησιμοποιήσω πόντους μαζί με κουπόνι;
      answer: Ναι. Μπορείς να ξοδέψεις πόντους παράλληλα με άλλες προσφορές και κωδικούς έκπτωσης.
    balance:
      question: Πού βλέπω το υπόλοιπο των πόντων μου;
      answer: Στη σελίδα Επιβράβευση του λογαριασμού σου, μαζί με το ιστορικό των συναλλαγών σου.
    return:
      question: Τι γίνεται αν επιστρέψω μια παραγγελία;
      answer: Οι πόντοι που κέρδισες από την αγορά αφαιρούνται από τον λογαριασμό σου. Όσους είχες ξοδέψει σε έκπτωση σου επιστρέφονται.
    signup:
      question: Χρειάζεται να κάνω κάτι για να συμμετέχω;
      answer: Όχι. Κάθε εγγεγραμμένος πελάτης συμμετέχει αυτόματα και οι πόντοι προστίθενται μόνοι τους.
en:
  title: Rewards programme
  meta_description: See how the rewards programme works. Earn points on every order and redeem them for discounts.
  breadcrumb:
    home: Home
  headline: Every euro earns you points.
  lead:
    earn: "Rewards are free: you earn {n} point for every euro. | Rewards are free: you earn {n} points for every euro."
    climb: Climb tiers to earn faster.
    spend: "Spend them at checkout: {ratio} points = {amount}."
  cta:
    join: Join free
    sign_in: Sign in
    shop: Shop now
    points: See your points
  example:
    eyebrow: Example
    order: "A {amount} order earns"
    points: "{points} pts"
    worth: "Worth {amount} at checkout"
    top: "On the {tier} tier points are multiplied ×{multiplier}"
  how:
    title: How it works
  steps:
    join:
      title: Join
      text: Create a free account.
      text_bonus: "Create a free account. Your first order earns {points} bonus points."
    earn:
      title: Earn
      text: "1 point for every euro you spend. | {n} points for every euro you spend."
      tier: Multiplied by your tier.
    climb:
      title: Climb
      rung: "{name} at {points}"
      text: "{rungs} points."
    spend:
      title: Spend
      text: "Use points at checkout. {ratio} points = {amount}."
  tiers:
    title: Tiers
    lead: Your tier is based on all the points you have ever earned.
  faq:
    title: Questions
    expire:
      question: Do points expire?
      answer_never: No. Points do not expire as long as your account stays active.
      answer_days: "Points expire {days} days after the order that earned them. Your balance and history are in your account."
    combine:
      question: Can I use points with a coupon?
      answer: Yes. You can spend points alongside other offers and discount codes.
    balance:
      question: Where do I see my points balance?
      answer: On the Rewards page of your account, along with your transaction history.
    return:
      question: What if I return an order?
      answer: The points you earned on that purchase come off your account. Any points you spent on a discount are returned to you.
    signup:
      question: Do I need to do anything to take part?
      answer: No. Every registered customer is in the programme automatically, and points are added for you.
</i18n>
