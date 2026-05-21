<script lang="ts" setup>
import type { ButtonProps } from '@nuxt/ui'

const { t } = useI18n()
const localePath = useLocalePath()

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('what-is-microlearning'),
    label: t('breadcrumb.items.what-is-microlearning.label'),
    icon: t('breadcrumb.items.what-is-microlearning.icon'),
    current: true,
  },
])

const heroLinks = computed<ButtonProps[]>(() => [
  {
    label: t('microlearning.cta.why'),
    to: localePath('why-microlearning'),
    trailingIcon: 'i-heroicons-arrow-right',
  },
])

useSeoMeta({
  title: t('microlearning.title'),
  description: t('microlearning.what'),
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
      :title="t('microlearning.what')"
      orientation="horizontal"
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
            To «microlearning» είναι ένα μοντέλο μάθησης που περιλαμβάνει την παροχή περιεχομένου σε μικρές δόσεις
            πληροφορίας (microcontent). Είναι σχεδιασμένο ώστε να είναι εύκολα καταναλώσιμο και διατηρήσιμο στη μνήμη
            του χρήστη (memory retention), επιτρέποντας στους εκπαιδευόμενους να εστιάζουν σε μια συγκεκριμένη έννοια ή
            δεξιότητα κάθε φορά. Αυτό μπορεί να γίνει μέσω διαφόρων μέσων, όπως βίντεο, διαδραστικά κουίζ και σύντομα
            άρθρα.
          </p>
          <p>
            Χρησιμοποιείται συχνά ως συμπλήρωμα των παραδοσιακών μορφών μάθησης, προκειμένου να βελτιωθεί η διατήρηση
            της πληροφορίας (memory retention) στη μνήμη του χρήστη. Το συγκεκριμένο μοντέλο είναι προσαρμοσμένο στις
            ανάγκες πολυάσχολων χρηστών με μικρή διάρκεια προσοχής (attention span) και περιορισμένο διαθέσιμο χρόνο
            για αποκόμιση πληροφορίας, με κύριο χαρακτηριστικό την ευελιξία χώρου και χρόνου που δίνεται στον χρήστη,
            δίνοντάς του τη δυνατότητα να αποκομίσει την πληροφορία σε χρόνο και τόπο που ταιριάζει με ένα πολυάσχολο
            πρόγραμμα.
          </p>
        </div>
      </template>

      <NuxtImg
        src="/img/pages/what-is-microlearning1.png"
        :width="960"
        :height="680"
        :alt="t('microlearning.what_alt_1')"
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
      :title="t('microlearning.section_curve.title')"
      orientation="horizontal"
      reverse
      :ui="{ container: `
        py-8
        sm:py-12
        lg:py-16
      ` }"
    >
      <template #description>
        <div class="space-y-4">
          <p>
            Το microlearning, βασίζεται στη θεωρία της «καμπύλης λήθης» (forgetting curve), η οποία σύμφωνα με τον
            Hermann Ebbinghaus, είναι μια γραφική αναπαράσταση της μείωσης της διατήρησης της μνήμης με την πάροδο του
            χρόνου. Η καμπύλη δείχνει ότι τείνουμε να ξεχνάμε γρήγορα τις νέες πληροφορίες αμέσως μετά την αποκόμισή
            τους, εκτός αν επανεξετάζουμε και εξασκούμε ενεργά τις πληροφορίες αυτές.
          </p>
          <p>
            Ο ρυθμός της λήθης ποικίλλει ανάλογα με τον τύπο της πληροφορίας, αλλά γενικά διαπιστώνεται ότι τα
            περισσότερα ξεχνιούνται τις πρώτες ημέρες μετά τη μάθηση και ο ρυθμός της λήθης επιβραδύνεται με την πάροδο
            του χρόνου.
          </p>
          <p>
            Tο microlearning είναι ένας νέος ερευνητικός τομέας που αποσκοπεί στη διερεύνηση νέων τρόπων ανταπόκρισης
            στην αυξανόμενη ανάγκη για δια βίου μάθηση ή μάθηση κατά παραγγελία των μελών της κοινωνίας, όπως οι
            εργαζόμενοι, οι gamers, μαθητές κ.α. Βασίζεται στην ιδέα της ανάπτυξης μικρών τμημάτων μαθησιακού
            περιεχομένου (microcontent) και ευέλικτων τεχνολογιών που μπορούν να επιτρέψουν στους εκπαιδευόμενους να
            έχουν ευκολότερη πρόσβαση σε αυτά σε συγκεκριμένες στιγμές και συνθήκες της ημέρας, για παράδειγμα κατά τη
            διάρκεια του χρόνου διαλείμματος ή εν κινήσει.
          </p>
        </div>
      </template>

      <NuxtImg
        src="/img/pages/what-is-microlearning2.png"
        :width="960"
        :height="860"
        :alt="t('microlearning.what_alt_2')"
        sizes="xs:320px sm:640px md:480px lg:480px xl:560px xxl:600px 2xl:600px"
        loading="lazy"
        quality="80"
        class="
          h-auto w-full rounded-2xl shadow-xl ring ring-default
        "
      />
    </UPageSection>

    <UPageSection
      :title="t('microlearning.section_content.title')"
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
            Όπως αναφέρθηκε και παραπάνω, το microlearning βασίζεται στη διανομή μικρών δόσεων πληροφορίας και
            περιεχομένου, γνωστών ως «microcontent». Το microcontent μπορεί να λάβει πολλές μορφές, όπως βίντεο μικρής
            διάρκειας, εικόνες, GIF και αναρτήσεις στα μέσα κοινωνικής δικτύωσης. Ο στόχος του μικροπεριεχομένου είναι
            να παρέχει μικρά, εστιασμένα κομμάτια πληροφοριών που είναι εύκολα καταναλώσιμα και κοινοποιήσιμα από τους
            χρήστες.
          </p>
          <p>
            Ένα από τα βασικά πλεονεκτήματα του μικροπεριεχομένου είναι η ικανότητά του να αιχμαλωτίζει και να διατηρεί
            την προσοχή των εκπαιδευομένων. Καθώς η διάρκεια της προσοχής γίνεται όλο και μικρότερη (attention span),
            οι εκπαιδευόμενοι μπορεί να είναι πιο πιθανό να ασχοληθούν με περιεχόμενο που είναι σύντομο και περιεκτικό.
            Το μικροπεριεχόμενο μπορεί επίσης να κοινοποιηθεί εύκολα σε πλατφόρμες κοινωνικής δικτύωσης, επιτρέποντας
            την ευρύτερη διάδοση και εμπλοκή σε αυτό.
          </p>
          <p>
            Παραδείγματα μικροπεριεχομένου είναι τα, podcasts, τα blogposts, σελίδες wiki, μηνύματα κειμένου,
            αναρτήσεις στα Social Media, ή άλλοι ψηφιακοί πόροι που αποτελούνται από σύνθετα ηχητικά, οπτικά και
            λεκτικά στοιχεία, τα οποία συνήθως δημιουργούνται, δημοσιεύονται και διαμοιράζονται στο διαδίκτυο.
          </p>
          <p>
            Τα παραπάνω παραδείγματα μικροπεριεχομένου είναι σχεδιασμένα έτσι ώστε να ανταποκρίνονται στις απαιτήσεις
            του σύγχρονου χρήστη με μικρό εύρος προσοχής. Μέσω του microcontent, oι δημιουργοί περιεχομένου προσπαθούν
            να καταφέρουν να κερδίσουν την προσοχή των χρηστών σε περίοδο χρόνου μικρότερη από ό,τι θα χρειαζόταν για
            να διαβάσουν ένα μακροσκελές άρθρο ή να παρακολουθήσουν ένα βίντεο μεγάλης διάρκειας.
          </p>
        </div>
      </template>

      <NuxtImg
        src="/img/pages/what-is-microlearning3.png"
        :width="960"
        :height="860"
        :alt="t('microlearning.what_alt_3')"
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
    what: Τι είναι το Microlearning
    what_alt_1: Εκπαιδευόμενος αξιοποιεί microlearning σε φορητή συσκευή
    what_alt_2: Η καμπύλη λήθης του Ebbinghaus και το microlearning
    what_alt_3: Παραδείγματα microcontent — βίντεο, εικόνες και άρθρα
    section_curve:
      title: Η θεωρία πίσω από το μοντέλο
    section_content:
      title: Τι είναι το microcontent
    cta:
      why: Γιατί Microlearning
  breadcrumb:
    items:
      what-is-microlearning:
        label: Τι είναι το Microlearning
        icon: i-heroicons-light-bulb
</i18n>
