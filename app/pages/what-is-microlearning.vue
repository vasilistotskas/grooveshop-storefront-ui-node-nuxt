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
    to: localePath('what-is-microlearning'),
    label: t('breadcrumb.items.what-is-microlearning.label'),
    icon: t('breadcrumb.items.what-is-microlearning.icon'),
    current: true,
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
      :text="t('microlearning.what')"
      class="mb-4 text-center capitalize"
    />

    <div class="article">
      <div class="grid items-center justify-center">
        <NuxtImg
          :style="{ objectFit: 'contain' }"
          src="/img/pages/what-is-microlearning1.png"
          :width="960"
          :height="680"
          alt="Webside"
          :modifiers="{ position: 'entropy' }"
          loading="eager"
          format="png"
          quality="100"
          preload
        />
      </div>
      <p
        class="
            text-primary-950

            dark:text-primary-50
          "
      >
        To «microlearning» είναι ένα μοντέλο μάθησης που περιλαμβάνει την παροχή περιεχομένου σε μικρές δόσεις
        πληροφορίας (microcontent).
        Είναι σχεδιασμένο ώστε να είναι εύκολα καταναλώσιμο και διατηρήσιμο στη μνήμη του χρήστη (memory retention),
        επιτρέποντας στους εκπαιδευόμενους να εστιάζουν σε μια συγκεκριμένη έννοια ή δεξιότητα κάθε φορά. Αυτό μπορεί
        να γίνει μέσω διαφόρων μέσων, όπως βίντεο, διαδραστικά κουίζ και σύντομα άρθρα.
        Χρησιμοποιείται συχνά ως συμπλήρωμα των παραδοσιακών μορφών μάθησης, προκειμένου να βελτιωθεί η διατήρηση της
        πληροφορίας (memory retention) στη μνήμη του χρήστη.
        Το συγκεκριμένο μοντέλο είναι προσαρμοσμένο στις ανάγκες πολυάσχολων χρηστών με μικρή διάρκεια προσοχής
        (attention span) και περιορισμένο διαθέσιμο χρόνο για αποκόμιση πληροφορίας, με κύριο χαρακτηριστικό την
        ευελιξία χώρου και χρόνου που δίνεται στον χρήστη, δίνοντάς του τη δυνατότητα να αποκομίσει την πληροφορία σε
        χρόνο και τόπο που ταιριάζει με ένα πολυάσχολο πρόγραμμα.
      </p>
      <div class="grid items-center justify-center">
        <NuxtImg
          :style="{ objectFit: 'contain' }"
          src="/img/pages/what-is-microlearning2.png"
          :width="960"
          :height="860"
          alt="Webside"
          loading="eager"
          format="png"
          quality="100"
          preload
        />
      </div>
      <p
        class="
            text-primary-950

            dark:text-primary-50
          "
      >
        Το microlearning, βασίζεται στη θεωρία της «καμπύλης λήθης» (forgetting curve), η οποία σύμφωνα με τον Hermann
        Ebbinghaus, είναι μια γραφική αναπαράσταση της μείωσης της διατήρησης της μνήμης με την πάροδο του χρόνου. Η
        καμπύλη δείχνει ότι τείνουμε να ξεχνάμε γρήγορα τις νέες πληροφορίες αμέσως μετά την αποκόμισή τους, εκτός αν
        επανεξετάζουμε και εξασκούμε ενεργά τις πληροφορίες αυτές.
        Ο ρυθμός της λήθης ποικίλλει ανάλογα με τον τύπο της πληροφορίας, αλλά γενικά διαπιστώνεται ότι τα περισσότερα
        ξεχνιούνται τις πρώτες ημέρες μετά τη μάθηση και ο ρυθμός της λήθης επιβραδύνεται με την πάροδο του χρόνου.
        Tο microlearning είναι ένας νέος ερευνητικός τομέας που αποσκοπεί στη διερεύνηση νέων τρόπων ανταπόκρισης στην
        αυξανόμενη ανάγκη για δια βίου μάθηση ή μάθηση κατά παραγγελία των μελών της κοινωνίας, όπως οι εργαζόμενοι,
        οι gamers, μαθητές κ.α.
        Βασίζεται στην ιδέα της ανάπτυξης μικρών τμημάτων μαθησιακού περιεχομένου (microcontent) και ευέλικτων
        τεχνολογιών που μπορούν να επιτρέψουν στους εκπαιδευόμενους να έχουν ευκολότερη πρόσβαση σε αυτά σε
        συγκεκριμένες στιγμές και συνθήκες της ημέρας, για παράδειγμα κατά τη διάρκεια του χρόνου διαλείμματος ή εν
        κινήσει.
      </p>
      <div class="grid items-center justify-center">
        <NuxtImg
          :style="{ objectFit: 'contain' }"
          src="/img/pages/what-is-microlearning3.png"
          :width="960"
          :height="860"
          alt="Webside"
          loading="eager"
          format="png"
          quality="100"
          preload
        />
      </div>
      <p
        class="
            text-primary-950

            dark:text-primary-50
          "
      >
        Όπως αναφέρθηκε και παραπάνω, το microlearning βασίζεται στη διανομή μικρών δόσεων πληροφορίας και
        περιεχομένου, γνωστών ως «microcontent». Το microcontent μπορεί να λάβει πολλές μορφές, όπως βίντεο μικρής
        διάρκειας, εικόνες, GIF και αναρτήσεις στα μέσα κοινωνικής δικτύωσης. Ο στόχος του μικροπεριεχομένου είναι να
        παρέχει μικρά, εστιασμένα κομμάτια πληροφοριών που είναι εύκολα καταναλώσιμα και κοινοποιήσιμα από τους
        χρήστες.
        Ένα από τα βασικά πλεονεκτήματα του μικροπεριεχομένου είναι η ικανότητά του να αιχμαλωτίζει και να διατηρεί
        την προσοχή των εκπαιδευομένων. Καθώς η διάρκεια της προσοχής γίνεται όλο και μικρότερη (attention span), οι
        εκπαιδευόμενοι μπορεί να είναι πιο πιθανό να ασχοληθούν με περιεχόμενο που είναι σύντομο και περιεκτικό. Το
        μικροπεριεχόμενο μπορεί επίσης να κοινοποιηθεί εύκολα σε πλατφόρμες κοινωνικής δικτύωσης, επιτρέποντας την
        ευρύτερη διάδοση και εμπλοκή σε αυτό.
        Παραδείγματα μικροπεριεχομένου είναι τα, podcasts, τα blogposts, σελίδες wiki, μηνύματα κειμένου, αναρτήσεις
        στα Social Media, ή άλλοι ψηφιακοί πόροι που αποτελούνται από σύνθετα ηχητικά, οπτικά και λεκτικά στοιχεία, τα
        οποία συνήθως δημιουργούνται, δημοσιεύονται και διαμοιράζονται στο διαδίκτυο.
        Τα παραπάνω παραδείγματα μικροπεριεχομένου είναι σχεδιασμένα έτσι ώστε να ανταποκρίνονται στις απαιτήσεις του
        σύγχρονου χρήστη με μικρό εύρος προσοχής. Μέσω του microcontent, oι δημιουργοί περιεχομένου προσπαθούν να
        καταφέρουν να κερδίσουν την προσοχή των χρηστών σε περίοδο χρόνου μικρότερη από ό,τι θα χρειαζόταν για να
        διαβάσουν ένα μακροσκελές άρθρο ή να παρακολουθήσουν ένα βίντεο μεγάλης διάρκειας.
      </p>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  microlearning:
    title: Microlearning
    what: Τι είναι το Microlearning
  breadcrumb:
    items:
      what-is-microlearning:
        label: Τι είναι το Microlearning
        icon: i-heroicons-light-bulb
</i18n>
