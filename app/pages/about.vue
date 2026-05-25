<script lang="ts" setup>
import type { ButtonProps, PageFeatureProps } from '@nuxt/ui'

const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const tenantStore = useTenantStore()

// Pages like about/vision contain tenant-specific copy (webside.gr
// inherited its text from the single-tenant era). The ``storeName``
// placeholder lets each tenant's i18n override substitute its own
// brand name without forking the template; full per-tenant content
// rewrites go through the ``page_config`` API.
// Fallback is the platform site name from runtime config — never a
// hardcoded brand string (N2 in MULTI_TENANT_AUDIT.md).
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
    to: localePath('about'),
    label: t('breadcrumb.items.about.label', { storeName: storeName.value }),
    icon: t('breadcrumb.items.about.icon'),
    current: true,
  },
])

const pageTitle = computed(() => t('title', { storeName: storeName.value }))

const heroLinks = computed<ButtonProps[]>(() => [
  {
    label: t('about.cta.vision'),
    to: localePath('vision'),
    icon: 'i-heroicons-eye',
  },
  {
    label: t('about.cta.what'),
    to: localePath('what-is-microlearning'),
    color: 'neutral',
    variant: 'subtle',
    trailingIcon: 'i-heroicons-arrow-right',
  },
])

const pillars = computed<PageFeatureProps[]>(() => [
  {
    icon: 'i-heroicons-academic-cap',
    title: t('about.pillars.education.title'),
    description: t('about.pillars.education.description'),
  },
  {
    icon: 'i-heroicons-shield-check',
    title: t('about.pillars.security.title'),
    description: t('about.pillars.security.description'),
  },
  {
    icon: 'i-heroicons-shopping-bag',
    title: t('about.pillars.shop.title'),
    description: t('about.pillars.shop.description'),
  },
])

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
      :headline="t('about.headline')"
      :title="pageTitle"
      orientation="horizontal"
      :links="heroLinks"
      :ui="{ container: `
        py-8
        sm:py-12
        lg:py-16
      ` }"
    >
      <template #headline>
        <span class="text-sm font-medium">{{ t('about.headline', { storeName }) }}</span>
      </template>
      <template #description>
        {{ t('body.p1', { storeName }) }}
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
        {{ t('about.platform.title') }}
      </h2>
      <p>{{ t('body.p2', { storeName }) }}</p>
      <p>{{ t('body.p3', { storeName }) }}</p>
      <p>{{ t('body.p4', { storeName }) }}</p>
      <p>{{ t('body.p5', { storeName }) }}</p>
    </section>

    <UPageSection
      :headline="t('about.pillars.headline')"
      :title="t('about.pillars.title')"
      :description="t('about.pillars.description')"
      :features="pillars"
      class="mt-12 border-t border-default"
    />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Τι Είναι Το {storeName}
  about:
    headline: '{storeName}'
    brand_alt: Η εφαρμογή {storeName} σε φορητές συσκευές
    platform:
      title: Η πλατφόρμα με μια ματιά
    pillars:
      headline: Οι τρεις πυλώνες μας
      title: Εκπαίδευση, Ασφάλεια, Κατάστημα
      description: Μία ενιαία εμπειρία που συνδυάζει microlearning, ψηφιακή προστασία και προσεγμένα tech προϊόντα.
      education:
        title: Microlearning
        description: Μικρές, εύπεπτες δόσεις γνώσης για να μαθαίνεις γρήγορα και αποτελεσματικά.
      security:
        title: Ηλεκτρονική Ασφάλεια
        description: Πρακτικές οδηγίες και tips για να προστατεύεσαι από σύγχρονες απειλές.
      shop:
        title: Tech Κατάστημα
        description: Επιλεγμένα gadgets που συμπληρώνουν το ψηφιακό σου ταξίδι.
    cta:
      vision: Το Όραμά μας
      what: Τι είναι το Microlearning
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
