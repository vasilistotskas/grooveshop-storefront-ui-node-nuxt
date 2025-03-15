<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const links = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('vision'),
    label: t('breadcrumb.items.vision.label'),
    icon: t('breadcrumb.items.vision.icon'),
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
  <PageWrapper class="container flex flex-col">
    <UBreadcrumb
      :links="links"
      :ui="{
        li: 'text-primary-950 dark:text-primary-50',
        base: 'text-xs md:text-md',
      }"
      class="container-xs relative mb-5 min-w-0"
    />
    <PageTitle
      :text="t('title')"
      class="mb-4 text-center capitalize"
    />

    <div class="article container-xs">
      <div class="grid items-center justify-center">
        <NuxtImg
          :style="{ objectFit: 'contain' }"
          src="/img/pages/about-webside.png"
          :width="960"
          :height="600"
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
        Στο Webside, οραματιζόμαστε έναν κόσμο όπου όλοι θα αξιοποιούν τη δύναμη της τεχνολογίας με αυτοπεποίθηση και
        ασφάλεια. Αποστολή μας είναι να καλλιεργήσουμε μια κουλτούρα ψηφιακού αλφαβητισμού και διαδικτυακής ασφάλειας
        σε μια εποχή όπου η τεχνολογία διαπερνά κάθε πτυχή της ζωής μας.
      </p>
      <p
        class="
            text-primary-950

            dark:text-primary-50
          "
      >
        Πιστεύουμε ότι η εκπαίδευση είναι ο ακρογωνιαίος λίθος της ενδυνάμωσης. Μέσω της προσέγγισής μας αναλύουμε
        πολύπλοκες τεχνολογικές έννοιες σε εύπεπτες δόσεις περιεχομένου, διασφαλίζοντας ότι η μάθηση είναι προσβάσιμη
        και ελκυστική για όλους.
      </p>
      <p
        class="
            text-primary-950

            dark:text-primary-50
          "
      >
        Είτε είσαι αρχάριος που περιηγείται στο ψηφιακό τοπίο είτε έμπειρος λάτρης της τεχνολογίας, το Webside σου
        παρέχει τα εργαλεία και τις γνώσεις για να ευδοκιμήσετις στο διαρκώς εξελισσόμενο τεχνολογικό οικοσύστημα.
      </p>
      <p
        class="
            text-primary-950

            dark:text-primary-50
          "
      >
        Το όραμά μας εκτείνεται πέρα από την απλή εκπαίδευση. Προσπαθούμε να καλλιεργήσουμε μια κοινότητα όπου τα
        άτομα όχι μόνο κατανοούν τη σημασία της διαδικτυακής ασφάλειας, αλλά και συμβάλλουν ενεργά στη διαμόρφωση ενός
        ασφαλέστερου ψηφιακού περιβάλλοντος για όλους. Εξοπλίζοντας τους χρήστες μας με πρακτικές γνώσεις, βέλτιστες
        πρακτικές και συμβουλές ειδικών, τους δίνουμε τη δυνατότητα να προστατεύουν το ψηφιακό τους αποτύπωμα και να
        περιηγούνται στο ψηφιακό πεδίο με αυτοπεποίθηση.
      </p>
      <p
        class="
            text-primary-950

            dark:text-primary-50
          "
      >
        Επιπλέον, το Webside δεν είναι απλώς μια πλατφόρμα εκμάθησης- είναι μια πύλη προς μια επιμελημένη επιλογή
        προϊόντων τεχνολογίας αιχμής.
      </p>
      <p
        class="
            text-primary-950

            dark:text-primary-50
          "
      >
        Το ηλεκτρονικό μας κατάστημα θα προσφέρει μια επιλεγμένη ποικιλία από gadgets και εργαλεία που έχουν
        σχεδιαστεί για να βελτιώνουν την ψηφιακή σας εμπειρία και να συμπληρώνουν το μαθησιακό σας ταξίδι.
      </p>
      <p
        class="
            text-primary-950

            dark:text-primary-50
          "
      >
        Ελάτε μαζί μας στην αποστολή μας να απομυθοποιήσουμε την τεχνολογία, να προωθήσουμε την ασφάλεια στο διαδίκτυο
        και να ανοίξουμε το δρόμο για ένα πιο έξυπνο, πιο συνδεδεμένο και ασφαλές μέλλον.
      </p>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Όραμα
  breadcrumb:
    items:
      vision:
        label: Όραμα
        icon: i-heroicons-eye
</i18n>
