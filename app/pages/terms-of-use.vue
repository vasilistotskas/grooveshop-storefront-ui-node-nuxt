<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('terms-of-use'),
    label: t('breadcrumb.items.terms-of-use.label'),
    icon: t('breadcrumb.items.terms-of-use.icon'),
    current: true,
  },
])

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
  <PageWrapper class="max-w-(--container-4xl) mx-auto flex flex-col">
    <UBreadcrumb
      :items="items"
      :ui="{
        item: 'text-primary-950 dark:text-primary-50',
        root: 'text-xs md:text-md',
      }"
      class="relative mb-5 min-w-0"
    />
    <PageTitle
      :text="t('title')"
      class="mb-4 text-center capitalize"
    />

    <div class="article">
      <p
        class="
            text-primary-950

            dark:text-primary-50
          "
      >
        Η χρήση της ιστοσελίδας webside.gr και τα σχετικά με αυτήν δικαιώματα και υποχρεώσεις διέπονται από τους όρους
        και προϋποθέσεις που παρατίθενται στο παρόν και στα αναπόσπαστα τμήματά του και ισχύουν για το σύνολο του
        περιεχομένου της και των επιμέρους σελίδων της. Η ιστοσελίδα απευθύνεται μόνο σε νομικά ή φυσικά πρόσωπα Η
        περιήγηση, η πρόσβαση ή η χρήση της ιστοσελίδας και των όποιων υπηρεσιών διατίθενται μέσω αυτής αποτελεί
        τεκμήριο ότι ο επισκέπτης/χρήστης έχει μελετήσει, κατανοήσει και αποδεχτεί όλους τους όρους χρήσης. Για το
        λόγο αυτό ο επισκέπτης καλείται να διαβάζει εκ των προτέρων το περιεχόμενου τους. Σε περίπτωση που ο
        επισκέπτης/ χρήστης δεν συμφωνεί με τους όρους χρήσης της ιστοσελίδας, οφείλει να μην κάνει χρήση των
        υπηρεσιών και του περιεχομένου της. To webside.gr διατηρεί το δικαίωμα μονομερούς τροποποίησης των όρων και
        προϋποθέσεων οποτεδήποτε και χωρίς προειδοποίηση. Το Webside θα αναρτά διαδικτυακά την εκάστοτε ισχύουσα
        έκδοση των όρων χρήσης, ενώ η συνέχιση της χρήσης της ιστοσελίδας ή των υπηρεσιών της θα θεωρείται ότι συνιστά
        αποδοχή των νέων όρων. Για το λόγο αυτό κάθε χρήστης παρακαλείται να ελέγχει ανά τακτά χρονικά διαστήματα τους
        όρους χρήσης. . Οι όροι χρήσης της ιστοσελίδας, καθώς και κάθε τροποποίησή τους, διέπονται από το εθνικό και
        το κοινοτικό δίκαιο και τυχόν εφαρμοστέες σχετικές διεθνείς συνθήκες. Οποιαδήποτε διάταξη των ανωτέρω όρων
        διαπιστωθεί ότι είναι αντίθετη με το ως άνω νομικό πλαίσιο ή καταστεί εκτός ισχύος, παύει αυτοδικαίως να
        ισχύει και αφαιρείται από το παρόν, χωρίς σε καμία περίπτωση να θίγεται η ισχύς των λοιπών όρων. Ομοίως, σε
        περίπτωση που κάποιοι όροι χρήσης καταστούν μερικώς ή ολικώς άκυροι ή μη εφαρμοστέοι, δεν επηρεάζεται η ισχύς
        ή/και η εγκυρότητα των υπολοίπων όρων ή μέρους αυτών. Οι άκυροι ή/και μη εφαρμοστέοι όροι θα αντικαθίστανται
        με όρους που θα πλησιάζουν όσο είναι δυνατόν το νόημα και το σκοπό των άκυρων ή μη εφαρμοστέων όρων. Διαφορές
        που τυχόν προκύπτουν από την εφαρμογή των όρων και την εν γένει χρήση της ιστοσελίδας από τον επισκέπτη ή
        χρήστη αυτής,θα επιλύονται καταρχήν φιλικά, αν όμως αυτό δεν καταστεί εφικτό θα διέπονται από το ελληνικό
        δίκαιο και θα υπάγονται στην αποκλειστική αρμοδιότητα των Δικαστηρίων της Αθήνας.
      </p>
      <p
        class="
            text-primary-950

            dark:text-primary-50
          "
      >
        Οι χρήστες της ιστοσελίδας οφείλουν να συμμορφώνονται με τους κανόνες και τις διατάξεις του Ελληνικού,
        Ευρωπαϊκού και Διεθνούς Δικαίου και τη σχετική νομοθεσία που διέπει τις τηλεπικοινωνίες και να απέχουν από
        κάθε παράνομη και καταχρηστική συμπεριφορά κατά τη χρήση αυτής και σε σχέση με αυτήν. Ο χρήστης της
        ιστοσελίδας ευθύνεται για οποιαδήποτε ζημία προκληθεί στον διαδικτυακό τόπο webside.gr αναγόμενη στη κακή ή
        αθέμιτη χρήση της ιστοσελίδας και των υπηρεσιών που προσφέρονται μέσω αυτής.
      </p>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Όροι Χρήσης
  breadcrumb:
    items:
      terms-of-use:
        label: Όροι Χρήσης
        icon: i-heroicons-user-group
</i18n>
