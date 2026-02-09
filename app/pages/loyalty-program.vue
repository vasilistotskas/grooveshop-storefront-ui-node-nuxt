<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

// Fetch loyalty settings using new API
const { data: settings, status } = useLoyalty().fetchSettings()

// Computed for loading state (compatible with template)
const loading = computed(() => status.value === 'pending')

// Computed values for dynamic content
const redemptionRate = computed(() => {
  if (!settings.value) return { points: 100, euros: 1 }
  return {
    points: settings.value.redemptionRatioEur,
    euros: 1,
  }
})

const redemptionExample = computed(() => {
  const ratio = redemptionRate.value.points
  return {
    examplePoints: ratio * 5, // 5x the ratio
    exampleEuros: 5,
  }
})

const earningRate = computed(() => {
  if (!settings.value) return { euros: 1, points: 1 }
  return {
    euros: 1,
    points: settings.value.pointsFactor,
  }
})

const showExpiration = computed(() => {
  return settings.value && settings.value.pointsExpirationDays > 0
})

const expirationDays = computed(() => {
  return settings.value?.pointsExpirationDays || 0
})

const showNewCustomerBonus = computed(() => {
  return settings.value && settings.value.newCustomerBonusEnabled
})

const newCustomerBonusPoints = computed(() => {
  return settings.value?.newCustomerBonusPoints || 0
})

const showTierBenefits = computed(() => {
  return settings.value && settings.value.tierMultiplierEnabled
})

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('loyalty-program'),
    label: t('breadcrumb.items.loyalty_program.label'),
    icon: t('breadcrumb.items.loyalty_program.icon'),
    current: true,
  },
])

// FAQ items with dynamic expiration answer
const faqItems = computed(() => [
  {
    label: t('faq.q1.question'),
    content: showExpiration.value
      ? t('faq.q1.answer_with_expiration', { days: expirationDays.value })
      : t('faq.q1.answer_no_expiration'),
    defaultOpen: false,
  },
  {
    label: t('faq.q2.question'),
    content: t('faq.q2.answer'),
    defaultOpen: false,
  },
  {
    label: t('faq.q3.question'),
    content: t('faq.q3.answer'),
    defaultOpen: false,
  },
  {
    label: t('faq.q4.question'),
    content: t('faq.q4.answer'),
    defaultOpen: false,
  },
  {
    label: t('faq.q5.question'),
    content: t('faq.q5.answer'),
    defaultOpen: false,
  },
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

definePageMeta({
  layout: 'default',
  middleware: ['loyalty-enabled'],
})
</script>

<template>
  <PageWrapper class="mx-auto flex max-w-6xl flex-col">
    <UBreadcrumb
      :items="items"
      :ui="{
        item: `
          text-primary-950
          dark:text-primary-50
        `,
        root: `
          text-xs
          md:text-base
        `,
      }"
      class="relative mb-5 min-w-0"
    />
    <PageTitle
      :text="t('title')"
      class="mb-8 text-center"
    />

    <div class="article space-y-8 md:space-y-12 xl:space-y-16">
      <!-- Introduction -->
      <section class="space-y-4">
        <div class="flex items-center justify-center">
          <div class="relative flex size-24 items-center justify-center">
            <svg viewBox="0 0 100 100" class="absolute inset-0 size-full">
              <polygon
                points="50 1 95 25 95 75 50 99 5 75 5 25"
                class="fill-warning-100 stroke-warning-500 dark:fill-warning-900 dark:stroke-warning-400"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
            <div class="relative z-10 flex flex-col items-center">
              <UIcon name="i-heroicons-star-solid" class="size-12 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
        </div>

        <p class="text-center text-lg font-medium text-primary-900 dark:text-primary-100">
          {{ t('intro.subtitle') }}
        </p>

        <p class="text-primary-950 dark:text-primary-50">
          {{ t('intro.description') }}
        </p>
      </section>

      <!-- How It Works -->
      <section class="space-y-6">
        <h2 class="text-2xl font-bold text-primary-900 dark:text-primary-100">
          {{ t('how_it_works.title') }}
        </h2>

        <div class="grid gap-6 md:grid-cols-3">
          <!-- Step 1: Earn Points -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <div class="flex size-12 items-center justify-center rounded-full bg-success-100 dark:bg-success-900">
                  <UIcon name="i-heroicons-shopping-cart" class="size-6 text-success-600 dark:text-success-400" />
                </div>
                <h3 class="text-lg font-semibold text-primary-900 dark:text-primary-100">
                  {{ t('how_it_works.step1.title') }}
                </h3>
              </div>
            </template>
            <p class="text-sm text-primary-700 dark:text-primary-300">
              {{ t('how_it_works.step1.description') }}
            </p>
          </UCard>

          <!-- Step 2: Accumulate Points -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <div class="flex size-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                  <UIcon name="i-heroicons-chart-bar" class="size-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 class="text-lg font-semibold text-primary-900 dark:text-primary-100">
                  {{ t('how_it_works.step2.title') }}
                </h3>
              </div>
            </template>
            <p class="text-sm text-primary-700 dark:text-primary-300">
              {{ t('how_it_works.step2.description') }}
            </p>
          </UCard>

          <!-- Step 3: Redeem Points -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <div class="flex size-12 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900">
                  <UIcon name="i-heroicons-gift" class="size-6 text-warning-600 dark:text-warning-400" />
                </div>
                <h3 class="text-lg font-semibold text-primary-900 dark:text-primary-100">
                  {{ t('how_it_works.step3.title') }}
                </h3>
              </div>
            </template>
            <p class="text-sm text-primary-700 dark:text-primary-300">
              {{ t('how_it_works.step3.description') }}
            </p>
          </UCard>
        </div>
      </section>

      <!-- Earning Points -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-primary-900 dark:text-primary-100">
          {{ t('earning.title') }}
        </h2>

        <UCard>
          <div v-if="loading" class="space-y-4">
            <USkeleton class="h-20 w-full" />
            <USkeleton class="h-20 w-full" />
          </div>
          <div v-else class="space-y-4">
            <div class="flex items-start gap-4">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-100 dark:bg-success-900">
                <UIcon name="i-heroicons-currency-euro" class="size-5 text-success-600 dark:text-success-400" />
              </div>
              <div class="flex-1">
                <h3 class="mb-2 font-semibold text-primary-900 dark:text-primary-100">
                  {{ t('earning.purchases.title') }}
                </h3>
                <p class="text-sm text-primary-700 dark:text-primary-300">
                  {{ t('earning.purchases.description', { euros: earningRate.euros, points: earningRate.points }) }}
                </p>
              </div>
            </div>

            <USeparator />

            <div class="flex items-start gap-4">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                <UIcon name="i-heroicons-calendar" class="size-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div class="flex-1">
                <h3 class="mb-2 font-semibold text-primary-900 dark:text-primary-100">
                  {{ t('earning.special_events.title') }}
                </h3>
                <p class="text-sm text-primary-700 dark:text-primary-300">
                  {{ t('earning.special_events.description') }}
                </p>
              </div>
            </div>

            <!-- New Customer Bonus (conditional) -->
            <template v-if="showNewCustomerBonus">
              <USeparator />
              <div class="flex items-start gap-4">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900">
                  <UIcon name="i-heroicons-gift" class="size-5 text-warning-600 dark:text-warning-400" />
                </div>
                <div class="flex-1">
                  <h3 class="mb-2 font-semibold text-primary-900 dark:text-primary-100">
                    {{ t('earning.new_customer_bonus.title') }}
                  </h3>
                  <p class="text-sm text-primary-700 dark:text-primary-300">
                    {{ t('earning.new_customer_bonus.description', { points: newCustomerBonusPoints }) }}
                  </p>
                </div>
              </div>
            </template>
          </div>
        </UCard>
      </section>

      <!-- Redeeming Points -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-primary-900 dark:text-primary-100">
          {{ t('redeeming.title') }}
        </h2>

        <p class="text-primary-950 dark:text-primary-50">
          {{ t('redeeming.description') }}
        </p>

        <UCard variant="soft" color="primary">
          <div v-if="loading" class="flex items-center gap-4">
            <USkeleton class="size-8 shrink-0" />
            <div class="flex-1 space-y-2">
              <USkeleton class="h-5 w-32" />
              <USkeleton class="h-4 w-48" />
            </div>
          </div>
          <div v-else class="flex items-center gap-4">
            <UIcon name="i-heroicons-information-circle" class="size-8 text-info-600 dark:text-info-400" />
            <div>
              <p class="font-semibold text-primary-900 dark:text-primary-100">
                {{ t('redeeming.conversion.title') }}
              </p>
              <p class="text-sm text-primary-700 dark:text-primary-300">
                {{ t('redeeming.conversion.description', {
                  points: redemptionRate.points,
                  euros: redemptionRate.euros,
                  examplePoints: redemptionExample.examplePoints,
                  exampleEuros: redemptionExample.exampleEuros,
                }) }}
              </p>
            </div>
          </div>
        </UCard>

        <div class="grid gap-4 md:grid-cols-2">
          <UCard>
            <div class="flex items-start gap-3">
              <UIcon name="i-heroicons-check-circle" class="size-6 shrink-0 text-success-600 dark:text-success-400" />
              <div>
                <h3 class="mb-1 font-semibold text-primary-900 dark:text-primary-100">
                  {{ t('redeeming.when.title') }}
                </h3>
                <p class="text-sm text-primary-700 dark:text-primary-300">
                  {{ t('redeeming.when.description') }}
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-start gap-3">
              <UIcon name="i-heroicons-arrow-path" class="size-6 shrink-0 text-primary-600 dark:text-primary-400" />
              <div>
                <h3 class="mb-1 font-semibold text-primary-900 dark:text-primary-100">
                  {{ t('redeeming.flexibility.title') }}
                </h3>
                <p class="text-sm text-primary-700 dark:text-primary-300">
                  {{ t('redeeming.flexibility.description') }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </section>

      <!-- Benefits -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-primary-900 dark:text-primary-100">
          {{ t('benefits.title') }}
        </h2>

        <div v-if="loading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <USkeleton v-for="i in 3" :key="i" class="h-48 w-full" />
        </div>
        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <UCard variant="soft">
            <div class="flex flex-col items-center gap-3 text-center">
              <div class="flex size-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-900">
                <UIcon name="i-heroicons-banknotes" class="size-8 text-success-600 dark:text-success-400" />
              </div>
              <h3 class="font-semibold text-primary-900 dark:text-primary-100">
                {{ t('benefits.save_money.title') }}
              </h3>
              <p class="text-sm text-primary-700 dark:text-primary-300">
                {{ t('benefits.save_money.description') }}
              </p>
            </div>
          </UCard>

          <UCard variant="soft">
            <div class="flex flex-col items-center gap-3 text-center">
              <div class="flex size-16 items-center justify-center rounded-full bg-info-100 dark:bg-info-900">
                <UIcon name="i-heroicons-sparkles" class="size-8 text-info-600 dark:text-info-400" />
              </div>
              <h3 class="font-semibold text-primary-900 dark:text-primary-100">
                {{ t('benefits.exclusive_offers.title') }}
              </h3>
              <p class="text-sm text-primary-700 dark:text-primary-300">
                {{ t('benefits.exclusive_offers.description') }}
              </p>
            </div>
          </UCard>

          <UCard variant="soft">
            <div class="flex flex-col items-center gap-3 text-center">
              <div class="flex size-16 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900">
                <UIcon name="i-heroicons-heart" class="size-8 text-warning-600 dark:text-warning-400" />
              </div>
              <h3 class="font-semibold text-primary-900 dark:text-primary-100">
                {{ t('benefits.reward_loyalty.title') }}
              </h3>
              <p class="text-sm text-primary-700 dark:text-primary-300">
                {{ showTierBenefits ? t('benefits.reward_loyalty.description_with_tiers') : t('benefits.reward_loyalty.description') }}
              </p>
            </div>
          </UCard>
        </div>
      </section>

      <!-- FAQ -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-primary-900 dark:text-primary-100">
          {{ t('faq.title') }}
        </h2>

        <div v-if="loading" class="space-y-2">
          <USkeleton v-for="i in 5" :key="i" class="h-16 w-full" />
        </div>
        <UAccordion
          v-else
          :items="faqItems"
        />
      </section>

      <!-- CTA -->
      <section class="space-y-4">
        <UCard variant="soft" color="primary" class="text-center">
          <div class="space-y-4">
            <UIcon name="i-heroicons-rocket-launch" class="mx-auto size-16 text-warning-600 dark:text-warning-400" />
            <h2 class="text-2xl font-bold text-primary-900 dark:text-primary-100">
              {{ t('cta.title') }}
            </h2>
            <p class="text-primary-700 dark:text-primary-300">
              {{ t('cta.description') }}
            </p>
            <div class="flex flex-wrap justify-center gap-4">
              <UButton
                size="lg"
                color="success"
                :to="localePath('products')"
              >
                {{ t('cta.shop_now') }}
              </UButton>
              <UButton
                size="lg"
                variant="outline"
                color="neutral"
                :to="localePath('account-loyalty')"
              >
                {{ t('cta.view_points') }}
              </UButton>
            </div>
          </div>
        </UCard>
      </section>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Πρόγραμμα Επιβράβευσης
  meta_description: Μάθετε πώς λειτουργεί το πρόγραμμα επιβράβευσης. Κερδίστε πόντους με κάθε αγορά και εξαργυρώστε τους για εκπτώσεις.
  breadcrumb:
    items:
      loyalty_program:
        label: Πρόγραμμα Επιβράβευσης
        icon: i-heroicons-star
  intro:
    subtitle: Κερδίστε πόντους με κάθε αγορά και απολαύστε εκπτώσεις!
    description: Το πρόγραμμα επιβράβευσης είναι ο τρόπος μας να σας ευχαριστήσουμε για την εμπιστοσύνη σας. Κάθε φορά που αγοράζετε από το κατάστημά μας, κερδίζετε πόντους που μπορείτε να μετατρέψετε σε εκπτώσεις για τις επόμενες αγορές σας. Είναι απλό, διαφανές και ανταποδοτικό!
  how_it_works:
    title: Πώς Λειτουργεί
    step1:
      title: 1. Κερδίστε Πόντους
      description: Κάθε ευρώ που ξοδεύετε σας δίνει πόντους. Όσο περισσότερο αγοράζετε, τόσο περισσότερους πόντους συγκεντρώνετε!
    step2:
      title: 2. Συγκεντρώστε Πόντους
      description: Οι πόντοι σας συσσωρεύονται στον λογαριασμό σας και μπορείτε να τους παρακολουθείτε ανά πάσα στιγμή από το προφίλ σας.
    step3:
      title: 3. Εξαργυρώστε Πόντους
      description: Χρησιμοποιήστε τους πόντους σας κατά την ολοκλήρωση της παραγγελίας για να λάβετε άμεση έκπτωση στο σύνολο!
  earning:
    title: Πώς Κερδίζω Πόντους;
    purchases:
      title: Αγορές Προϊόντων
      description: Για κάθε {euros}€ που ξοδεύετε, κερδίζετε {points} πόντο. Είναι τόσο απλό! Όσο μεγαλύτερη η αγορά σας, τόσο περισσότεροι πόντοι συγκεντρώνετε.
    special_events:
      title: Ειδικές Προσφορές & Εκδηλώσεις
      description: Κατά καιρούς προσφέρουμε διπλάσιους ή τριπλάσιους πόντους σε επιλεγμένα προϊόντα ή κατηγορίες. Μείνετε συντονισμένοι για να μην χάσετε τις ευκαιρίες!
    new_customer_bonus:
      title: Μπόνους Νέου Πελάτη
      description: Κερδίστε {points} πόντους μπόνους με την πρώτη σας παραγγελία! Ένας υπέροχος τρόπος να ξεκινήσετε τη συλλογή πόντων.
  redeeming:
    title: Πώς Εξαργυρώνω Πόντους;
    description: Η εξαργύρωση πόντων είναι πολύ εύκολη! Κατά την ολοκλήρωση της παραγγελίας σας, θα δείτε την επιλογή να χρησιμοποιήσετε τους πόντους σας. Απλά επιλέξτε πόσους πόντους θέλετε να εξαργυρώσετε και η έκπτωση θα εφαρμοστεί αυτόματα στο σύνολο της παραγγελίας σας.
    conversion:
      title: Αξία Πόντων
      description: Κάθε {points} πόντοι ισούνται με {euros}€ έκπτωση. Για παράδειγμα, {examplePoints} πόντοι = {exampleEuros}€ έκπτωση!
    when:
      title: Πότε Μπορώ να Εξαργυρώσω;
      description: Μπορείτε να εξαργυρώσετε τους πόντους σας οποιαδήποτε στιγμή κατά την ολοκλήρωση της παραγγελίας, αρκεί να έχετε τουλάχιστον 1 πόντο στον λογαριασμό σας.
    flexibility:
      title: Ευελιξία Εξαργύρωσης
      description: Εσείς αποφασίζετε πόσους πόντους θέλετε να χρησιμοποιήσετε κάθε φορά. Μπορείτε να τους κρατήσετε για μεγαλύτερες αγορές ή να τους χρησιμοποιήσετε σταδιακά.
  benefits:
    title: Γιατί να Συμμετέχω;
    save_money:
      title: Εξοικονομήστε Χρήματα
      description: Κάθε αγορά σας φέρνει πιο κοντά σε εκπτώσεις για τις επόμενες αγορές σας.
    exclusive_offers:
      title: Αποκλειστικές Προσφορές
      description: Τα μέλη του προγράμματος λαμβάνουν πρόσβαση σε ειδικές προσφορές και διπλάσιους πόντους.
    reward_loyalty:
      title: Ανταμοιβή
      description: Όσο περισσότερο αγοράζετε, τόσο περισσότερα οφέλη απολαμβάνετε!
      description_with_tiers: Όσο περισσότερο αγοράζετε, τόσο περισσότερα οφέλη απολαμβάνετε! Ανεβείτε σε υψηλότερες βαθμίδες για να κερδίζετε ακόμα περισσότερους πόντους με κάθε αγορά.
  faq:
    title: Συχνές Ερωτήσεις
    q1:
      question: Λήγουν οι πόντοι μου;
      answer_no_expiration: Όχι! Οι πόντοι σας δεν λήγουν ποτέ, εφόσον ο λογαριασμός σας παραμένει ενεργός. Μπορείτε να τους συγκεντρώνετε και να τους χρησιμοποιείτε όποτε θέλετε.
      answer_with_expiration: Οι πόντοι σας λήγουν μετά από {days} ημέρες από την ημερομηνία που κερδίστηκαν. Φροντίστε να τους χρησιμοποιήσετε πριν λήξουν!
    q2:
      question: Μπορώ να συνδυάσω πόντους με άλλες εκπτώσεις;
      answer: Ναι! Μπορείτε να χρησιμοποιήσετε τους πόντους σας μαζί με άλλες προσφορές και εκπτωτικούς κωδικούς για ακόμα μεγαλύτερη εξοικονόμηση.
    q3:
      question: Πώς μπορώ να δω το υπόλοιπο των πόντων μου;
      answer: Μπορείτε να δείτε το υπόλοιπο των πόντων σας ανά πάσα στιγμή από τη σελίδα "Πρόγραμμα Επιβράβευσης" στον λογαριασμό σας. Εκεί θα βρείτε επίσης το ιστορικό των συναλλαγών σας.
    q4:
      question: Τι γίνεται αν επιστρέψω ένα προϊόν;
      answer: Αν επιστρέψετε ένα προϊόν, οι πόντοι που κερδίσατε από αυτή την αγορά θα αφαιρεθούν από τον λογαριασμό σας. Αν είχατε χρησιμοποιήσει πόντους για έκπτωση, θα επιστραφούν στον λογαριασμό σας.
    q5:
      question: Χρειάζεται να κάνω κάτι ειδικό για να συμμετέχω;
      answer: Όχι! Όλοι οι εγγεγραμμένοι χρήστες συμμετέχουν αυτόματα στο πρόγραμμα επιβράβευσης. Απλά κάντε τις αγορές σας και οι πόντοι θα προστίθενται αυτόματα!
  cta:
    title: Ξεκινήστε να Κερδίζετε Πόντους Σήμερα!
    description: Κάθε αγορά σας μετράει. Ξεκινήστε να συγκεντρώνετε πόντους και απολαύστε εκπτώσεις στις επόμενες αγορές σας.
    shop_now: Αγοράστε Τώρα
    view_points: Δείτε τους Πόντους σας
</i18n>
