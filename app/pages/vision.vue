<script lang="ts" setup>
import type { ButtonProps } from '@nuxt/ui'

const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const tenantStore = useTenantStore()

const storeName = computed(
  () => tenantStore.storeName || (config.public.appTitle as string),
)

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('vision'),
    label: t('breadcrumb.items.vision.label'),
    icon: t('breadcrumb.items.vision.icon'),
    current: true,
  },
])

const heroLinks = computed<ButtonProps[]>(() => [
  {
    label: t('vision.cta.about'),
    to: localePath('about'),
    icon: 'i-heroicons-information-circle',
    color: 'neutral',
    variant: 'subtle',
  },
  {
    label: t('vision.cta.microlearning'),
    to: localePath('what-is-microlearning'),
    trailingIcon: 'i-heroicons-arrow-right',
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
      :title="t('title')"
      orientation="horizontal"
      reverse
      :links="heroLinks"
      :ui="{ container: `
        py-8
        sm:py-12
        lg:py-16
      ` }"
    >
      <template #description>
        Στο {{ storeName }}, οραματιζόμαστε έναν κόσμο όπου όλοι θα αξιοποιούν τη δύναμη της τεχνολογίας με αυτοπεποίθηση και
        ασφάλεια. Αποστολή μας είναι να καλλιεργήσουμε μια κουλτούρα ψηφιακού αλφαβητισμού και διαδικτυακής ασφάλειας
        σε μια εποχή όπου η τεχνολογία διαπερνά κάθε πτυχή της ζωής μας.
      </template>

      <NuxtImg
        :src="tenantStore.logoLightUrl || '/img/pages/about-webside.png'"
        :width="960"
        :height="600"
        :alt="storeName"
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

    <section
      class="
        mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-primary-950
        sm:mt-12
        md:text-lg
        dark:text-primary-50
      "
    >
      <h2 class="text-balance text-2xl font-bold md:text-3xl">
        {{ t('vision.education.title') }}
      </h2>
      <p>
        Πιστεύουμε ότι η εκπαίδευση είναι ο ακρογωνιαίος λίθος της ενδυνάμωσης. Μέσω της προσέγγισής μας αναλύουμε
        πολύπλοκες τεχνολογικές έννοιες σε εύπεπτες δόσεις περιεχομένου, διασφαλίζοντας ότι η μάθηση είναι προσβάσιμη
        και ελκυστική για όλους.
      </p>
      <p>
        Είτε είσαι αρχάριος που περιηγείται στο ψηφιακό τοπίο είτε έμπειρος λάτρης της τεχνολογίας, το {{ storeName }} σου
        παρέχει τα εργαλεία και τις γνώσεις για να ευδοκιμήσετις στο διαρκώς εξελισσόμενο τεχνολογικό οικοσύστημα.
      </p>
    </section>

    <section
      class="
        mx-auto mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-primary-950
        sm:mt-14
        md:text-lg
        dark:text-primary-50
      "
    >
      <h2 class="text-balance text-2xl font-bold md:text-3xl">
        {{ t('vision.community.title') }}
      </h2>
      <p>
        Το όραμά μας εκτείνεται πέρα από την απλή εκπαίδευση. Προσπαθούμε να καλλιεργήσουμε μια κοινότητα όπου τα
        άτομα όχι μόνο κατανοούν τη σημασία της διαδικτυακής ασφάλειας, αλλά και συμβάλλουν ενεργά στη διαμόρφωση ενός
        ασφαλέστερου ψηφιακού περιβάλλοντος για όλους. Εξοπλίζοντας τους χρήστες μας με πρακτικές γνώσεις, βέλτιστες
        πρακτικές και συμβουλές ειδικών, τους δίνουμε τη δυνατότητα να προστατεύουν το ψηφιακό τους αποτύπωμα και να
        περιηγούνται στο ψηφιακό πεδίο με αυτοπεποίθηση.
      </p>
    </section>

    <section
      class="
        mx-auto mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-primary-950
        sm:mt-14
        md:text-lg
        dark:text-primary-50
      "
    >
      <h2 class="text-balance text-2xl font-bold md:text-3xl">
        {{ t('vision.shop.title') }}
      </h2>
      <p>
        Επιπλέον, το {{ storeName }} δεν είναι απλώς μια πλατφόρμα εκμάθησης- είναι μια πύλη προς μια επιμελημένη επιλογή
        προϊόντων τεχνολογίας αιχμής.
      </p>
      <p>
        Το ηλεκτρονικό μας κατάστημα θα προσφέρει μια επιλεγμένη ποικιλία από gadgets και εργαλεία που έχουν
        σχεδιαστεί για να βελτιώνουν την ψηφιακή σας εμπειρία και να συμπληρώνουν το μαθησιακό σας ταξίδι.
      </p>
    </section>

    <UCard
      variant="subtle"
      class="
        mx-auto mt-12 max-w-3xl
        sm:mt-16
      "
      :ui="{ body: `
        flex gap-4
        sm:gap-6
      ` }"
    >
      <UIcon
        name="i-heroicons-megaphone"
        class="
          size-7 shrink-0 text-primary
          sm:size-9
        "
      />
      <p
        class="
          text-base font-medium text-balance text-primary-950
          sm:text-lg
          dark:text-primary-50
        "
      >
        Ελάτε μαζί μας στην αποστολή μας να απομυθοποιήσουμε την τεχνολογία, να προωθήσουμε την ασφάλεια στο διαδίκτυο
        και να ανοίξουμε το δρόμο για ένα πιο έξυπνο, πιο συνδεδεμένο και ασφαλές μέλλον.
      </p>
    </UCard>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Όραμα
  vision:
    brand_alt: Το όραμα του {storeName} για ψηφιακή ενδυνάμωση
    education:
      title: Εκπαίδευση για όλους
    community:
      title: Μια κοινότητα που προστατεύει
    shop:
      title: Πέρα από την εκπαίδευση
    cta:
      about: Τι είναι το {storeName}
      microlearning: Τι είναι το Microlearning
  breadcrumb:
    items:
      vision:
        label: Όραμα
        icon: i-heroicons-eye

  body:
    p1: >-
      Στο {storeName}, οραματιζόμαστε έναν κόσμο όπου όλοι θα αξιοποιούν τη
      δύναμη της τεχνολογίας με αυτοπεποίθηση και ασφάλεια. Αποστολή μας είναι
      να καλλιεργήσουμε μια κουλτούρα ψηφιακού αλφαβητισμού και διαδικτυακής
      ασφάλειας σε μια εποχή όπου η τεχνολογία διαπερνά κάθε πτυχή της ζωής μας.
    p2: >-
      Πιστεύουμε ότι η εκπαίδευση είναι ο ακρογωνιαίος λίθος της ενδυνάμωσης.
      Μέσω της προσέγγισής μας αναλύουμε πολύπλοκες τεχνολογικές έννοιες σε
      εύπεπτες δόσεις περιεχομένου, διασφαλίζοντας ότι η μάθηση είναι προσβάσιμη
      και ελκυστική για όλους.
    p3: >-
      Είτε είσαι αρχάριος που περιηγείται στο ψηφιακό τοπίο είτε έμπειρος λάτρης
      της τεχνολογίας, το {storeName} σου παρέχει τα εργαλεία και τις γνώσεις
      για να ευδοκιμήσετις στο διαρκώς εξελισσόμενο τεχνολογικό οικοσύστημα.
    p4: >-
      Το όραμά μας εκτείνεται πέρα από την απλή εκπαίδευση. Προσπαθούμε να
      καλλιεργήσουμε μια κοινότητα όπου τα άτομα όχι μόνο κατανοούν τη σημασία
      της διαδικτυακής ασφάλειας, αλλά και συμβάλλουν ενεργά στη διαμόρφωση ενός
      ασφαλέστερου ψηφιακού περιβάλλοντος για όλους. Εξοπλίζοντας τους χρήστες
      μας με πρακτικές γνώσεις, βέλτιστες πρακτικές και συμβουλές ειδικών, τους
      δίνουμε τη δυνατότητα να προστατεύουν το ψηφιακό τους αποτύπωμα και να
      περιηγούνται στο ψηφιακό πεδίο με αυτοπεποίθηση.
    p5: >-
      Επιπλέον, το {storeName} δεν είναι απλώς μια πλατφόρμα εκμάθησης — είναι
      μια πύλη προς μια επιμελημένη επιλογή προϊόντων τεχνολογίας αιχμής.
</i18n>
