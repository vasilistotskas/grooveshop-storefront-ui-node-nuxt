<script lang="ts" setup>
import type { ButtonProps, PageFeatureProps } from '@nuxt/ui'

const { t } = useI18n()
const localePath = useLocalePath()

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('why-microlearning'),
    label: t('breadcrumb.items.why-microlearning.label'),
    icon: t('breadcrumb.items.why-microlearning.icon'),
    current: true,
  },
])

const heroLinks = computed<ButtonProps[]>(() => [
  {
    label: t('microlearning.cta.what'),
    to: localePath('what-is-microlearning'),
    color: 'neutral',
    variant: 'subtle',
    trailingIcon: 'i-heroicons-arrow-right',
  },
])

const reasons = computed<PageFeatureProps[]>(() => [
  {
    icon: 'i-heroicons-clock',
    title: t('microlearning.reasons.time.title'),
    description: t('microlearning.reasons.time.description'),
  },
  {
    icon: 'i-heroicons-device-phone-mobile',
    title: t('microlearning.reasons.flexible.title'),
    description: t('microlearning.reasons.flexible.description'),
  },
  {
    icon: 'i-heroicons-sparkles',
    title: t('microlearning.reasons.interactive.title'),
    description: t('microlearning.reasons.interactive.description'),
  },
])

useSeoMeta({
  title: t('microlearning.title'),
  description: t('microlearning.why'),
})
useHead({
  title: t('microlearning.title'),
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
    <UPageHero
      :title="t('microlearning.why')"
      orientation="horizontal"
      reverse
      :links="heroLinks"
      :ui="{ container: `
        py-8
        sm:py-12
        lg:py-16
      ` }"
    >
      <template #headline>
        <span class="text-sm font-medium">{{ t('microlearning.title') }}</span>
      </template>
      <template #description>
        <div class="space-y-4">
          <p>
            Είναι γεγονός το ότι ζούμε σε έναν κόσμο που είναι σε μεγάλο βαθμό βυθισμένος στην ψηφιακή τεχνολογία. Η
            σύγχρονη καθημερινότητα ενέχει πολλές αποσπάσεις οι οποίες μπορούν πολύ εύκολα να μειώσουν το εύρος
            προσοχής και συνεπώς μπορούν κάλλιστα να δυσχεράνουν οποιαδήποτε διαδικασία εκμάθησης ή αποκόμισης
            γνώσεων.
          </p>
          <p>
            Το microlearning και το microcontent είναι ιδιαίτερα χρήσιμα και αποδοτικά για χρήστες με μικρό εύρος
            προσοχής για διάφορους λόγους. H συχνή έκθεση σε μικρές και συνοπτικές ενότητες αυξάνει την κατανόηση και
            την απορρόφηση των πληροφοριών από τους χρήστες. Το microlearning και συνεπώς το microcontent μπορεί να
            βοηθήσει στην αποφυγή της αποπλάνησης και της απόσπασης της προσοχής του χρήστη, καθώς παρέχει συνοπτικές
            και σαφείς πληροφορίες.
          </p>
          <p>
            Tο microlearning αποτελεί ένα μοντέλο, κομμένο και ραμμένο στα μέτρα πολυάσχολων ατόμων με μικρό διαθέσιμο
            χρόνο για εκμάθηση και μικρό εύρος προσοχής.
          </p>
        </div>
      </template>

      <NuxtImg
        src="/img/pages/why-microlearning1.png"
        :width="960"
        :height="960"
        :alt="t('microlearning.why_alt_1')"
        :modifiers="{ position: 'entropy' }"
        sizes="xs:320px sm:640px md:480px lg:480px xl:560px xxl:600px 2xl:600px"
        loading="eager"
        quality="80"
        preload
        fetchpriority="high"
        class="
          h-auto w-full rounded-2xl shadow-xl ring ring-default
        "
      />
    </UPageHero>

    <UPageSection
      :headline="t('microlearning.reasons.headline')"
      :title="t('microlearning.reasons.title')"
      :description="t('microlearning.reasons.description')"
      :features="reasons"
      class="border-t border-default"
    />

    <UPageSection
      :title="t('microlearning.flexible.title')"
      orientation="horizontal"
      :ui="{ container: `
        border-t border-default py-8
        sm:py-12
        lg:py-16
      ` }"
    >
      <template #description>
        <div class="space-y-4">
          <p>
            Ο ευέλικτος και προσαρμοσμένος σχεδιασμός ανάλογων εκπαιδευτικών ενοτήτων, επιτρέπει το συγκεκριμένο κοινό
            να απορροφήσει το παρεχόμενο περιεχόμενο εύκολα και γρήγορα, όπου και όποτε αυτό επιθυμεί.
          </p>
          <p>
            Επιπροσθέτως, τα στοιχεία που προκύπτουν από τον σχεδιασμό μίας εκπαιδευτικής ενότητας microlearning, μέσω
            της διαδραστικότητας και της παιχνιδοποίησης του γραφικού περιβάλλοντος, αποτελούν ένα ακόμα κίνητρο και
            αρωγή προς το κοινό, ώστε να προβούν αποκόμιση γνώσεων διαμέσου αυτού του μοντέλου.
          </p>
          <p>
            Οι παραδοσιακοί μέθοδοι ηλεκτρονικής μάθησης όπως τα μακροσκελή βίντεο και εκπαιδευτικές ενότητες που
            απαιτούν εβδομάδες ή μήνες για ολοκλήρωση, μπορούν εύκολα να δυσχεράνουν οποιαδήποτε εκπαιδευτική
            διαδικασία. Διανύοντας τον αιώνα της πιο ραγδαίας τεχνολογικής ανάπτυξης και συνεπώς των ψηφιακών μέσων,
            γίνεται έυκολα αντιληπτό ότι οι άνθρωποι ξοδεύουν ολοένα και περισσότερο χρόνο από τη μέρα τους στις
            ηλεκτρονικές τους συσκευές, κάτι που συνεπάγεται με πληθώρα ψηφιακών αποσπάσεων προσοχής όπως οι
            διαφημίσεις, συνεχώς εναλλασσόμενο περιεχόμενο κ.α.
          </p>
          <p>
            Για αυτόν ακριβώς το λόγο, οι παραδοσιακοί μέθοδοι ηλεκτρονικής μάθησης χάνουν την ευχριστία τους, μέρα με
            τη μέρα ακόμα περισσότερο.
          </p>
        </div>
      </template>

      <NuxtImg
        src="/img/pages/why-microlearning2.png"
        :width="960"
        :height="600"
        :alt="t('microlearning.why_alt_2')"
        :modifiers="{ position: 'entropy' }"
        sizes="xs:320px sm:640px md:480px lg:480px xl:560px xxl:600px 2xl:600px"
        loading="lazy"
        quality="80"
        class="
          h-auto w-full rounded-2xl shadow-xl ring ring-default
        "
      />
    </UPageSection>

    <UPageSection
      :title="t('microlearning.attention.title')"
      orientation="horizontal"
      reverse
      :ui="{ container: `
        border-t border-default py-8
        sm:py-12
        lg:py-16
      ` }"
    >
      <template #description>
        <div class="space-y-4">
          <p>
            Ένας σύγχρονος μέσος χρήστης του διαδικτύου, διαθέτει περιορισμένο χρόνο για ηλεκτρονική αποκίμιση
            πληροφορίας και επιθυμεί να έχει πρόσβαση σε αυτήν με το πιο εύκολο και γρήγορο τρόπο προσπαθώντας να
            αποκομίσει όσο το δυνατό μεγαλύτερη πληροφορία κατά τον λιγοστό χρόνο που ξοδέυει κατά τη διάρκεια της
            ημέρας του για αποκόμιση γνώσεων.
          </p>
          <p>
            Εκμεταλέυοντας την συγκεκριμένη κατάσταση, το microlearning εστιάζει στην οργάνωση των εκπαιδευτικών
            ενοτήτων με τέτοιο τρόπο, με τον οποίο η παρεχόμενη πληροφορία θα μπορεί να απορροφηθεί και να παραμείνει
            στη μνήμη του χρήστη, για το μεγαλύτερο δυνατό χρονικό διάστημα. Μία από τις πιο βασικές τεχνικές, είναι η
            παροχή ερωτήσεων στον χρήστη κατά τη διάρκεια ενασχόλησης με μία ενότητα.
          </p>
        </div>
      </template>

      <NuxtImg
        src="/img/pages/why-microlearning3.png"
        :width="960"
        :height="700"
        :alt="t('microlearning.why_alt_3')"
        :modifiers="{ position: 'entropy' }"
        sizes="xs:320px sm:640px md:480px lg:480px xl:560px xxl:600px 2xl:600px"
        loading="lazy"
        quality="80"
        class="
          h-auto w-full rounded-2xl shadow-xl ring ring-default
        "
      />
    </UPageSection>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  microlearning:
    title: Microlearning
    why: Γιατί Microlearning
    why_alt_1: Σύγχρονος χρήστης σε ψηφιακό περιβάλλον γεμάτο αποσπάσεις
    why_alt_2: Ευέλικτη εκπαίδευση οπουδήποτε και οποτεδήποτε
    why_alt_3: Αυξημένη συγκράτηση γνώσεων μέσω microlearning
    reasons:
      headline: Τα πλεονεκτήματα
      title: Γιατί λειτουργεί το microlearning
      description: Τρεις βασικοί λόγοι που το συγκεκριμένο μοντέλο ταιριάζει στις απαιτήσεις του σύγχρονου κοινού.
      time:
        title: Λιγοστός χρόνος
        description: Σχεδιασμένο για πολυάσχολους χρήστες που μαθαίνουν σε μικρά διαλείμματα της ημέρας.
      flexible:
        title: Ευέλικτη πρόσβαση
        description: Περιεχόμενο διαθέσιμο όπου και όποτε ταιριάζει στο πρόγραμμα του χρήστη.
      interactive:
        title: Διαδραστικό
        description: Παιχνιδοποίηση και διαδραστικότητα ενισχύουν τη συμμετοχή και τη συγκράτηση.
    flexible:
      title: Ευελιξία και παιχνιδοποίηση
    attention:
      title: Συγκράτηση σε λιγοστό χρόνο
    cta:
      what: Τι είναι το Microlearning
  breadcrumb:
    items:
      why-microlearning:
        label: Γιατί Microlearning
        icon: i-heroicons-light-bulb
</i18n>
