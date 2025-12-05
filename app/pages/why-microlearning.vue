<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('why-microlearning'),
    label: t('breadcrumb.items.why-microlearning.label'),
    icon: t('breadcrumb.items.why-microlearning.icon'),
    current: true,
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
  <PageWrapper class="mx-auto flex max-w-(--container-4xl) flex-col">
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
      :text="t('microlearning.why')"
      class="mb-4 text-center capitalize"
    />

    <div class="article">
      <div class="grid items-center justify-center">
        <NuxtImg
          :style="{ objectFit: 'contain' }"
          src="/img/pages/why-microlearning1.png"
          :width="960"
          :height="960"
          alt="Webside"
          :modifiers="{ position: 'entropy' }"
          loading="eager"
          quality="80"
          preload
          fetchpriority="high"
        />
      </div>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        Είναι γεγονός το ότι ζούμε σε έναν κόσμο που είναι σε μεγάλο βαθμό βυθισμένος στην ψηφιακή τεχνολογία. Η
        σύγχρονη καθημερινότητα ενέχει πολλές αποσπάσεις οι οποίες μπορούν πολύ εύκολα να μειώσουν το εύρος προσοχής
        και συνεπώς μπορούν κάλλιστα να δυσχεράνουν οποιαδήποτε διαδικασία εκμάθησης ή αποκόμισης γνώσεων.
        Το microlearning και το microcontent είναι ιδιαίτερα χρήσιμα και αποδοτικά για χρήστες με μικρό εύρος προσοχής
        για διάφορους λόγους. H συχνή έκθεση σε μικρές και συνοπτικές ενότητες αυξάνει την κατανόηση και την
        απορρόφηση των πληροφοριών από τους χρήστες. Το microlearning και συνεπώς το microcontent μπορεί να βοηθήσει
        στην αποφυγή της αποπλάνησης και της απόσπασης της προσοχής του χρήστη, καθώς παρέχει συνοπτικές και σαφείς
        πληροφορίες.
        Tο microlearning αποτελεί ένα μοντέλο, κομμένο και ραμμένο στα μέτρα πολυάσχολων ατόμων με μικρό διαθέσιμο
        χρόνο για εκμάθηση και μικρό εύρος προσοχής.
      </p>
      <div class="grid items-center justify-center">
        <NuxtImg
          :style="{ objectFit: 'contain' }"
          src="/img/pages/why-microlearning2.png"
          :width="960"
          :height="600"
          alt="Webside"
          :modifiers="{ position: 'entropy' }"
          loading="lazy"
          quality="80"
        />
      </div>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        Ο ευέλικτος και προσαρμοσμένος σχεδιασμός ανάλογων εκπαιδευτικών ενοτήτων, επιτρέπει το συγκεκριμένο κοινό να
        απορροφήσει το παρεχόμενο περιεχόμενο εύκολα και γρήγορα, όπου και όποτε αυτό επιθυμεί.
      </p>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        Επιπροσθέτως, τα στοιχεία που προκύπτουν από τον σχεδιασμό μίας εκπαιδευτικής ενότητας microlearning, μέσω της
        διαδραστικότητας και της παιχνιδοποίησης του γραφικού περιβάλλοντος, αποτελούν ένα ακόμα κίνητρο και αρωγή
        προς το κοινό, ώστε να προβούν αποκόμιση γνώσεων διαμέσου αυτού του μοντέλου.
        Οι παραδοσιακοί μέθοδοι ηλεκτρονικής μάθησης όπως τα μακροσκελή βίντεο και εκπαιδευτικές ενότητες που απαιτούν
        εβδομάδες ή μήνες για ολοκλήρωση, μπορούν εύκολα να δυσχεράνουν οποιαδήποτε εκπαιδευτική διαδικασία.
        Διανύοντας τον αιώνα της πιο ραγδαίας τεχνολογικής ανάπτυξης και συνεπώς των ψηφιακών μέσων, γίνεται έυκολα
        αντιληπτό ότι οι άνθρωποι ξοδεύουν ολοένα και περισσότερο χρόνο από τη μέρα τους στις ηλεκτρονικές τους
        συσκευές, κάτι που συνεπάγεται με πληθώρα ψηφιακών αποσπάσεων προσοχής όπως οι διαφημίσεις, συνεχώς
        εναλλασσόμενο περιεχόμενο κ.α.
        Για αυτόν ακριβώς το λόγο, οι παραδοσιακοί μέθοδοι ηλεκτρονικής μάθησης χάνουν την ευχριστία τους, μέρα με τη
        μέρα ακόμα περισσότερο.
      </p>
      <div class="grid items-center justify-center">
        <NuxtImg
          :style="{ objectFit: 'contain' }"
          src="/img/pages/why-microlearning3.png"
          :width="960"
          :height="700"
          alt="Webside"
          :modifiers="{ position: 'entropy' }"
          loading="lazy"
          quality="80"
        />
      </div>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        Ένας σύγχρονος μέσος χρήστης του διαδικτύου, διαθέτει περιορισμένο χρόνο για ηλεκτρονική αποκίμιση πληροφορίας
        και επιθυμεί να έχει πρόσβαση σε αυτήν με το πιο εύκολο και γρήγορο τρόπο προσπαθώντας να αποκομίσει όσο το
        δυνατό μεγαλύτερη πληροφορία κατά τον λιγοστό χρόνο που ξοδέυει κατά τη διάρκεια της ημέρας του για αποκόμιση
        γνώσεων.
        Εκμεταλέυοντας την συγκεκριμένη κατάσταση, το microlearning εστιάζει στην οργάνωση των εκπαιδευτικών ενοτήτων
        με τέτοιο τρόπο, με τον οποίο η παρεχόμενη πληροφορία θα μπορεί να απορροφηθεί και να παραμείνει στη μνήμη του
        χρήστη, για το μεγαλύτερο δυνατό χρονικό διάστημα. Μία από τις πιο βασικές τεχνικές, είναι η παροχή ερωτήσεων
        στον χρήστη κατά τη διάρκεια ενασχόλησης με μία ενότητα.
      </p>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  microlearning:
    title: Microlearning
    why: Γιατί Microlearning
  breadcrumb:
    items:
      why-microlearning:
        label: Γιατί Microlearning
        icon: i-heroicons-light-bulb
</i18n>
