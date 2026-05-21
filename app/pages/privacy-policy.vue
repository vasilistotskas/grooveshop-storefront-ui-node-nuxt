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
    to: localePath('privacy-policy'),
    label: t('breadcrumb.items.privacy-policy.label'),
    icon: t('breadcrumb.items.privacy-policy.icon'),
    current: true,
  },
])

const tocLinks = [
  { id: 'intro', text: 'Εισαγωγή' },
  { id: 'data-categories', text: 'Κατηγορίες προσωπικών δεδομένων' },
  { id: 'account-creation', text: 'Δημιουργία λογαριασμού' },
  { id: 'marketing-communications', text: 'Ενημερώσεις και προσφορές' },
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
      :description="t('legal.privacy.description')"
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
        <section id="intro">
          <h2>Εισαγωγή</h2>
          <p>
            Θα θέλαμε να σας ενημερώσουμε ότι για το Webside η προστασία των προσωπικών δεδομένων των χρηστών μας έχει
            πρωταρχική σημασία. Για το λόγο αυτό λαμβάνουμε τα κατάλληλα μέτρα για να προστατέψουμε τα προσωπικά
            δεδομένα που επεξεργαζόμαστε από τυχόν απώλεια, αλλοίωση, διαρροή, παράνομη διαβίβαση ή με οποιοδήποτε άλλο
            τρόπο αθέμιτη επεξεργασία και να διασφαλίσουμε ότι η επεξεργασία των προσωπικών σας δεδομένων
            πραγματοποιείται πάντοτε σύμφωνα με τις υποχρεώσεις που τίθενται από το νομικό πλαίσιο, τόσο από την ίδια
            την εταιρία, όσο και από τρίτους που επεξεργάζονται προσωπικά δεδομένα για λογαριασμό της εταιρίας.
          </p>
          <p>
            Τι είναι το GDPR; Ο Γενικός Κανονισμός για την Προστασία των Προσωπικών Δεδομένων (General Data Protection
            Regulation – GDPR) αποτελεί το νέο ρυθμιστικό πλαίσιο της Ευρωπαϊκή Ένωσης (ΕΕ) στον εξεταζόμενο τομέα.
            Αντικείμενο του Κανονισμού είναι η θέσπιση των προϋποθέσεων για την επεξεργασία δεδομένων προσωπικού
            χαρακτήρα, προς προστασία των δικαιωμάτων και των ελευθεριών των φυσικών προσώπων και ιδίως του δικαιώματος
            προστασίας προσωπικών δεδομένων.
          </p>
        </section>

        <section id="data-categories">
          <h2>Ποιες κατηγορίες προσωπικών δεδομένων επεξεργαζόμαστε;</h2>
          <p>
            Τα προσωπικά δεδομένα που επεξεργαζόμαστε, είναι τα απολύτως αναγκαία, απαραίτητα και κατάλληλα για την
            επίτευξη των επιδιωκόμενων σκοπών μας και συνοψίζονται στα εξής: Προσωπικά δεδομένα, τα οποία μας παρέχετε
            εσείς, όπως:
          </p>
          <ul>
            <li>
              Δεδομένα ταυτοποίησης προσώπου & νομιμοποίησης του υποκειμένου των συναλλαγών (ονοματεπώνυμο, ημερομηνία
              γέννησης, κ.α.)
            </li>
            <li>
              Δεδομένα επικοινωνίας (ταχυδρομική διεύθυνση (E-mail), αριθμός σταθερής ή κινητής τηλεφωνίας, διεύθυνση
              ηλεκτρονικού ταχυδρομείου, FAX, κ.α.)
            </li>
          </ul>
        </section>

        <section id="account-creation">
          <h2>Για τη δημιουργία λογαριασμού στο {{ siteHost }}</h2>
          <p>
            Προσωπικά δεδομένα συλλέγονται όταν δημιουργείτε λογαριασμό στον ιστότοπο του Webside {{ siteHost }}. Κατά
            τη δημιουργία λογαριασμού μπορεί να σας ζητηθούν περισσότερα στοιχεία, ωστόσο θα είναι τα ελάχιστα
            απαιτούμενα για τη σύναψη και ολοκλήρωση δημιουργίας.
          </p>
        </section>

        <section id="marketing-communications">
          <h2>Για να σας ενημερώσουμε για τα νέα και τις προσφορές μας</h2>
          <p>
            Εφόσον έχετε συναινέσει σε αυτό ή καλύπτεται από το έννομο συμφέρον μας, (στις περιπτώσεις των
            εγγεγραμένων χρηστών - πελατών) και υπό τις συγκεκριμένες προϋποθέσεις που θέτει το νομικό πλαίσιο, σας
            αποστέλλουμε ενημερώσεις για προϊόντα, υπηρεσίες, προσφορές κλπ. μέσω E-mail αλλά και των μέσων κοινωνικής
            δικτύωσης που διατηρούμε (Facebook/Instagram/Youtube κ.α.). Ειδικότερα, το Webside επεξεργάζεται προσωπικά
            δεδομένα σύμφωνα με το ισχύον κάθε φορά πλαίσιο, σας ενημερώνει για προσφορές και τα νέα μας μέσω της
            αποστολής ενημερωτικών newsletters.
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
  title: Πολιτική Απορρήτου
  legal:
    headline: Νομικά
    lastUpdated: 'Τελευταία ενημέρωση: {date}'
    toc:
      title: Σε αυτή τη σελίδα
    privacy:
      description: Πώς συλλέγουμε, χρησιμοποιούμε και προστατεύουμε τα προσωπικά σας δεδομένα.
  breadcrumb:
    items:
      privacy-policy:
        label: Πολιτική Απορρήτου
        icon: i-heroicons-clipboard-document-list
</i18n>
