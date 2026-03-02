<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()
const { storeName } = storeToRefs(useTenantStore())

const i18nParams = computed(() => ({ storeName: storeName.value }))

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('about'),
    label: t('breadcrumb.items.about.label', i18nParams.value),
    icon: t('breadcrumb.items.about.icon'),
    current: true,
  },
])

useSeoMeta({
  titleTemplate: '%s',
  title: t('title', i18nParams.value),
})
useHead({
  titleTemplate: '%s',
  title: t('title', i18nParams.value),
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
      :text="t('title', i18nParams)"
      class="mb-4 text-center capitalize"
    />

    <div class="article">
      <div class="grid items-center justify-center">
        <NuxtImg
          :style="{ objectFit: 'contain' }"
          src="/img/pages/about-hero.png"
          :width="960"
          :height="600"
          :alt="storeName"
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
        Χρησιμοποιώντας ως γνώμονα το μοντέλο ηλεκτρονικής μάθησης «Microlearning», ολοκληρώθηκε η δημιουργία της
        τελικής μορφής της εφαρμογής “{{ storeName }}”.
      </p>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        To {{ storeName }}, είναι μία ηλεκτρονική πλατφόρμα Microlearning και ηλεκτρονικού εμπορίου, όπου μπορείς να
        εκπαιδευτείς και να λάβεις χρήσιμες πληροφορίες σχετικά με την ηλεκτρονική προστασία σου από ηλεκτρονικές
        απειλές και να ενημερωθείς – εκπαιδευτείς δωρεάν σχετικά με βέλτιστες πρακτικές, συμβουλές και tips σχετικά με
        τον κλάδο της τεχνολογίας (PC, Mobile, AI κ.α.).
      </p>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        Ο σκοπός του {{ storeName }} είναι η οικοδόμηση μίας κουλτούρας τεχνολογικής γνώσης και ηλεκτρονικής ασφάλειας, στα
        πλαίσια της αυξητικής τάσης χρήσης της τεχνολογίας σε καθημερινή βάση.
      </p>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        Για την δημιουργία και παροχή του περιεχομένου σε όλα τα ψηφιακά κανάλια (ιστοσελίδα, social media κ.α.),
        γίνεται η χρήση διάφορων εκπαιδευτικών μεθόδων όπως το Microlearning, με τέτοιο τρόπο ώστε ο κάθε χρήστης να
        μπορεί να αφομοιώσει το συγκεκριμένο περιεχόμενο εύκολα και γρήγορα με μικρές δόσεις πληροφορίας.
      </p>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        Παράλληλα, το {{ storeName }} περιλαμβάνει και ηλεκτρονικό κατάστημα τεχνολογικών προιόντων, μέσω του οποίου μπορείς
        να
        αγοράσεις χρήσιμα tech gadgets τα οποία κατά κύριο λόγο θα συνδέονται άμεσα με το αντικείμενο των
        εκπαιδευτικών
        ενοτήτων (PC, Mobile, AI κ.α.).
      </p>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Τι Είναι Το {storeName}
  breadcrumb:
    items:
      about:
        label: Τι Είναι Το {storeName}
        icon: i-heroicons-information-circle
</i18n>
