<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const runtimeConfig = useRuntimeConfig()
const siteHost = computed(() => {
  try {
    return new URL(runtimeConfig.public.baseUrl).host
  }
  catch {
    return useRequestURL().host
  }
})

const LAST_UPDATED = '21 Μαΐου 2026'

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('terms-of-use'),
    label: t('breadcrumb.items.terms-of-use.label'),
    icon: t('breadcrumb.items.terms-of-use.icon'),
    current: true,
  },
])

const tocLinks = [
  { id: 'scope', text: 'Πεδίο εφαρμογής' },
  { id: 'acceptance', text: 'Αποδοχή των όρων' },
  { id: 'modifications', text: 'Τροποποιήσεις των όρων' },
  { id: 'applicable-law', text: 'Εφαρμοστέο δίκαιο' },
  { id: 'jurisdiction', text: 'Επίλυση διαφορών' },
  { id: 'user-obligations', text: 'Υποχρεώσεις χρηστών' },
]

useSeoMeta({
  title: t('title'),
})
useHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="flex flex-col">
    <UBreadcrumb
      :items="items"
      :ui="{
        item: `
          text-primary-950
          dark:text-primary-50
        `,
        root: `
          px-4 text-xs
          sm:px-6
          md:text-base
          lg:px-8
        `,
      }"
      class="relative mb-3 min-w-0"
    />
    <UPageHeader
      :title="t('title')"
      :description="t('legal.terms.description', { siteHost })"
    >
      <template #headline>
        <UBadge
          color="neutral"
          variant="subtle"
          icon="i-heroicons-clock"
        >
          {{ t('legal.lastUpdated', { date: LAST_UPDATED }) }}
        </UBadge>
      </template>
    </UPageHeader>

    <div
      class="
        mt-6 flex flex-col gap-6
        lg:grid lg:grid-cols-[1fr_15rem] lg:items-start lg:gap-10
      "
    >
      <article
        class="
          article text-primary-950
          dark:text-primary-50
        "
      >
        <section id="scope">
          <h2>Πεδίο εφαρμογής</h2>
          <p>
            Η χρήση της ιστοσελίδας {{ siteHost }} και τα σχετικά με αυτήν δικαιώματα και υποχρεώσεις διέπονται από τους
            όρους και προϋποθέσεις που παρατίθενται στο παρόν και στα αναπόσπαστα τμήματά του και ισχύουν για το σύνολο
            του περιεχομένου της και των επιμέρους σελίδων της. Η ιστοσελίδα απευθύνεται μόνο σε νομικά ή φυσικά
            πρόσωπα.
          </p>
        </section>

        <section id="acceptance">
          <h2>Αποδοχή των όρων</h2>
          <p>
            Η περιήγηση, η πρόσβαση ή η χρήση της ιστοσελίδας και των όποιων υπηρεσιών διατίθενται μέσω αυτής αποτελεί
            τεκμήριο ότι ο επισκέπτης/χρήστης έχει μελετήσει, κατανοήσει και αποδεχτεί όλους τους όρους χρήσης. Για το
            λόγο αυτό ο επισκέπτης καλείται να διαβάζει εκ των προτέρων το περιεχόμενου τους. Σε περίπτωση που ο
            επισκέπτης/ χρήστης δεν συμφωνεί με τους όρους χρήσης της ιστοσελίδας, οφείλει να μην κάνει χρήση των
            υπηρεσιών και του περιεχομένου της.
          </p>
        </section>

        <section id="modifications">
          <h2>Τροποποιήσεις των όρων</h2>
          <p>
            To {{ siteHost }} διατηρεί το δικαίωμα μονομερούς τροποποίησης των όρων και προϋποθέσεων οποτεδήποτε και
            χωρίς προειδοποίηση. Το Webside θα αναρτά διαδικτυακά την εκάστοτε ισχύουσα έκδοση των όρων χρήσης, ενώ η
            συνέχιση της χρήσης της ιστοσελίδας ή των υπηρεσιών της θα θεωρείται ότι συνιστά αποδοχή των νέων όρων. Για
            το λόγο αυτό κάθε χρήστης παρακαλείται να ελέγχει ανά τακτά χρονικά διαστήματα τους όρους χρήσης.
          </p>
        </section>

        <section id="applicable-law">
          <h2>Εφαρμοστέο δίκαιο</h2>
          <p>
            Οι όροι χρήσης της ιστοσελίδας, καθώς και κάθε τροποποίησή τους, διέπονται από το εθνικό και το κοινοτικό
            δίκαιο και τυχόν εφαρμοστέες σχετικές διεθνείς συνθήκες. Οποιαδήποτε διάταξη των ανωτέρω όρων διαπιστωθεί
            ότι είναι αντίθετη με το ως άνω νομικό πλαίσιο ή καταστεί εκτός ισχύος, παύει αυτοδικαίως να ισχύει και
            αφαιρείται από το παρόν, χωρίς σε καμία περίπτωση να θίγεται η ισχύς των λοιπών όρων. Ομοίως, σε περίπτωση
            που κάποιοι όροι χρήσης καταστούν μερικώς ή ολικώς άκυροι ή μη εφαρμοστέοι, δεν επηρεάζεται η ισχύς ή/και η
            εγκυρότητα των υπολοίπων όρων ή μέρους αυτών. Οι άκυροι ή/και μη εφαρμοστέοι όροι θα αντικαθίστανται με
            όρους που θα πλησιάζουν όσο είναι δυνατόν το νόημα και το σκοπό των άκυρων ή μη εφαρμοστέων όρων.
          </p>
        </section>

        <section id="jurisdiction">
          <h2>Επίλυση διαφορών</h2>
          <p>
            Διαφορές που τυχόν προκύπτουν από την εφαρμογή των όρων και την εν γένει χρήση της ιστοσελίδας από τον
            επισκέπτη ή χρήστη αυτής, θα επιλύονται καταρχήν φιλικά, αν όμως αυτό δεν καταστεί εφικτό θα διέπονται από
            το ελληνικό δίκαιο και θα υπάγονται στην αποκλειστική αρμοδιότητα των Δικαστηρίων της Αθήνας.
          </p>
        </section>

        <section id="user-obligations">
          <h2>Υποχρεώσεις χρηστών</h2>
          <p>
            Οι χρήστες της ιστοσελίδας οφείλουν να συμμορφώνονται με τους κανόνες και τις διατάξεις του Ελληνικού,
            Ευρωπαϊκού και Διεθνούς Δικαίου και τη σχετική νομοθεσία που διέπει τις τηλεπικοινωνίες και να απέχουν από
            κάθε παράνομη και καταχρηστική συμπεριφορά κατά τη χρήση αυτής και σε σχέση με αυτήν. Ο χρήστης της
            ιστοσελίδας ευθύνεται για οποιαδήποτε ζημία προκληθεί στον διαδικτυακό τόπο {{ siteHost }} αναγόμενη στη
            κακή ή αθέμιτη χρήση της ιστοσελίδας και των υπηρεσιών που προσφέρονται μέσω αυτής.
          </p>
        </section>
      </article>

      <LegalToc
        :title="t('legal.toc.title')"
        :links="tocLinks"
      />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Όροι Χρήσης
  legal:
    headline: Νομικά
    lastUpdated: 'Τελευταία ενημέρωση: {date}'
    toc:
      title: Σε αυτή τη σελίδα
    terms:
      description: Οι όροι και προϋποθέσεις που διέπουν τη χρήση της ιστοσελίδας {siteHost}.
  breadcrumb:
    items:
      terms-of-use:
        label: Όροι Χρήσης
        icon: i-heroicons-user-group
</i18n>
