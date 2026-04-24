<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const tenantStore = useTenantStore()

// Pages like about/vision contain tenant-specific copy (webside.gr
// inherited its text from the single-tenant era). The ``storeName``
// placeholder lets each tenant's i18n override substitute its own
// brand name without forking the template; full per-tenant content
// rewrites go through the ``page_config`` API.
const storeName = computed(() => tenantStore.storeName || 'Webside')

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('about'),
    label: t('breadcrumb.items.about.label', { storeName: storeName.value }),
    icon: t('breadcrumb.items.about.icon'),
    current: true,
  },
])

const pageTitle = computed(() => t('title', { storeName: storeName.value }))

useSeoMeta({
  titleTemplate: '%s',
  title: () => pageTitle.value,
})
useHead({
  titleTemplate: '%s',
  title: () => pageTitle.value,
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
      :text="pageTitle"
      class="mb-4 text-center capitalize"
    />

    <div class="article">
      <div class="grid items-center justify-center">
        <NuxtImg
          :style="{ objectFit: 'contain' }"
          :src="tenantStore.logoLightUrl || '/img/pages/about-webside.png'"
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
        {{ t('body.p1', { storeName }) }}
      </p>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        {{ t('body.p2', { storeName }) }}
      </p>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        {{ t('body.p3', { storeName }) }}
      </p>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        {{ t('body.p4', { storeName }) }}
      </p>
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        {{ t('body.p5', { storeName }) }}
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
  body:
    p1: >-
      Χρησιμοποιώντας ως γνώμονα το μοντέλο ηλεκτρονικής μάθησης «Microlearning»,
      ολοκληρώθηκε η δημιουργία της τελικής μορφής της εφαρμογής "{storeName}".
    p2: >-
      To {storeName}, είναι μία ηλεκτρονική πλατφόρμα Microlearning και
      ηλεκτρονικού εμπορίου, όπου μπορείς να εκπαιδευτείς και να λάβεις χρήσιμες
      πληροφορίες σχετικά με την ηλεκτρονική προστασία σου από ηλεκτρονικές
      απειλές και να ενημερωθείς – εκπαιδευτείς δωρεάν σχετικά με βέλτιστες
      πρακτικές, συμβουλές και tips σχετικά με τον κλάδο της τεχνολογίας
      (PC, Mobile, AI κ.α.).
    p3: >-
      Ο σκοπός του {storeName} είναι η οικοδόμηση μίας κουλτούρας τεχνολογικής
      γνώσης και ηλεκτρονικής ασφάλειας, στα πλαίσια της αυξητικής τάσης χρήσης
      της τεχνολογίας σε καθημερινή βάση.
    p4: >-
      Για την δημιουργία και παροχή του περιεχομένου σε όλα τα ψηφιακά κανάλια
      (ιστοσελίδα, social media κ.α.), γίνεται η χρήση διάφορων εκπαιδευτικών
      μεθόδων όπως το Microlearning, με τέτοιο τρόπο ώστε ο κάθε χρήστης να
      μπορεί να αφομοιώσει το συγκεκριμένο περιεχόμενο εύκολα και γρήγορα με
      μικρές δόσεις πληροφορίας.
    p5: >-
      Παράλληλα, το {storeName} περιλαμβάνει και ηλεκτρονικό κατάστημα
      τεχνολογικών προιόντων, μέσω του οποίου μπορείς να αγοράσεις χρήσιμα
      tech gadgets τα οποία κατά κύριο λόγο θα συνδέονται άμεσα με το
      αντικείμενο των εκπαιδευτικών ενοτήτων (PC, Mobile, AI κ.α.).
</i18n>
