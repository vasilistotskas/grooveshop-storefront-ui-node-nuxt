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
    to: localePath('about'),
    label: t('breadcrumb.items.about.label'),
    icon: t('breadcrumb.items.about.icon'),
    current: true,
  },
])

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
  title: t('title'),
})
useHead({
  titleTemplate: '%s',
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
      :headline="t('about.headline')"
      :title="t('title')"
      orientation="horizontal"
      :links="heroLinks"
      :ui="{ container: `
        py-8
        sm:py-12
        lg:py-16
      ` }"
    >
      <template #headline>
        <span class="text-sm font-medium">{{ t('about.headline') }}</span>
      </template>
      <template #description>
        Χρησιμοποιώντας ως γνώμονα το μοντέλο ηλεκτρονικής μάθησης «Microlearning», ολοκληρώθηκε η δημιουργία της
        τελικής μορφής της εφαρμογής «Webside».
      </template>

      <NuxtImg
        src="/img/pages/about-webside.png"
        :width="960"
        :height="600"
        :alt="t('about.brand_alt')"
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
      <p>
        To Webside, είναι μία ηλεκτρονική πλατφόρμα Microlearning και ηλεκτρονικού εμπορίου, όπου μπορείς να
        εκπαιδευτείς και να λάβεις χρήσιμες πληροφορίες σχετικά με την ηλεκτρονική προστασία σου από ηλεκτρονικές
        απειλές και να ενημερωθείς – εκπαιδευτείς δωρεάν σχετικά με βέλτιστες πρακτικές, συμβουλές και tips σχετικά με
        τον κλάδο της τεχνολογίας (PC, Mobile, AI κ.α.).
      </p>
      <p>
        Ο σκοπός του Webside είναι η οικοδόμηση μίας κουλτούρας τεχνολογικής γνώσης και ηλεκτρονικής ασφάλειας, στα
        πλαίσια της αυξητικής τάσης χρήσης της τεχνολογίας σε καθημερινή βάση.
      </p>
      <p>
        Για την δημιουργία και παροχή του περιεχομένου σε όλα τα ψηφιακά κανάλια (ιστοσελίδα, social media κ.α.),
        γίνεται η χρήση διάφορων εκπαιδευτικών μεθόδων όπως το Microlearning, με τέτοιο τρόπο ώστε ο κάθε χρήστης να
        μπορεί να αφομοιώσει το συγκεκριμένο περιεχόμενο εύκολα και γρήγορα με μικρές δόσεις πληροφορίας.
      </p>
      <p>
        Παράλληλα, το Webside περιλαμβάνει και ηλεκτρονικό κατάστημα τεχνολογικών προιόντων, μέσω του οποίου μπορείς να
        αγοράσεις χρήσιμα tech gadgets τα οποία κατά κύριο λόγο θα συνδέονται άμεσα με το αντικείμενο των εκπαιδευτικών
        ενοτήτων (PC, Mobile, AI κ.α.).
      </p>
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
  title: Τι Είναι Το Webside
  about:
    headline: Webside
    brand_alt: Η εφαρμογή Webside σε φορητές συσκευές
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
        label: Τι Είναι Το Webside
        icon: i-heroicons-information-circle
</i18n>
