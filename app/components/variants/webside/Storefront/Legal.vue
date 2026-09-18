<script lang="ts" setup>
/**
 * The body of the four legal routes (terms, privacy, cookies, returns).
 *
 * One component, because the four pages differed only in the route
 * they named: the document comes from the tenant's own ContentPage via
 * `useLegalPage`, which resolves the slug through LEGAL_ROUTE_SLUGS so
 * a route cannot pair itself with the wrong document.
 */
const props = defineProps<{
  route: LegalRouteName
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const runtimeConfig = useRuntimeConfig()
const tenantStore = useTenantStore()

const siteHost = computed(() => {
  if (tenantStore.primaryDomain) return tenantStore.primaryDomain
  try {
    return new URL(runtimeConfig.public.baseUrl).host
  }
  catch {
    return useRequestURL().host
  }
})

// The document is the tenant's own ContentPage — see useLegalPage for
// why this page no longer carries the platform's text as a fallback.
const {
  title,
  body,
  tocLinks,
  updatedAt,
  hasDocument,
  error,
  documentLocale,
  isFallback,
  fallbackLanguageName,
}
  = await useLegalPage(props.route)

// Same normalization as the section pages: a backend outage is a 503,
// a genuinely absent document is a 404. Rendering an empty <main> with
// HTTP 200 would be a soft-404 that Google keeps indexed, on a page the
// footer links from every other page of the store.
if (error.value || !hasDocument.value) {
  const upstreamStatus = error.value?.statusCode ?? 404
  throw createError(
    upstreamStatus >= 500
      ? { statusCode: 503, message: t('error.service.unavailable') }
      : { statusCode: 404, message: t('error.page.not.found') },
  )
}

const lastUpdated = computed(() =>
  updatedAt.value
    ? new Date(updatedAt.value).toLocaleDateString(locale.value, {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '',
)

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath(props.route),
    label: t(`breadcrumb.items.${props.route}.label`),
    icon: t(`breadcrumb.items.${props.route}.icon`),
    current: true,
  },
])

const description = computed(() =>
  t(`legal.${props.route}.description`, { siteHost: siteHost.value }),
)

useSeoMeta({
  title: () => title.value,
})
useHead({
  title: () => title.value,
})
</script>

<template>
  <WebsidePageWrapper class="flex flex-col">
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
      :title="title"
      :description="description"
    >
      <template
        v-if="lastUpdated"
        #headline
      >
        <UBadge
          color="neutral"
          variant="subtle"
          icon="i-heroicons-clock"
        >
          {{ t('legal.lastUpdated', { date: lastUpdated }) }}
        </UBadge>
      </template>
    </UPageHeader>

    <UAlert
      v-if="isFallback"
      color="neutral"
      variant="subtle"
      icon="i-heroicons-language"
      :title="t('legal.fallbackNotice', { language: fallbackLanguageName })"
      class="mt-4"
    />

    <div
      class="
        mt-6 flex flex-col gap-6
        lg:grid lg:grid-cols-[1fr_15rem] lg:items-start lg:gap-10
      "
    >
      <article
        :lang="documentLocale"
        class="
          article text-primary-950
          dark:text-primary-50
        "
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="body" />
      </article>

      <WebsideLegalToc
        :title="t('legal.toc.title')"
        :links="tocLinks"
      />
    </div>
  </WebsidePageWrapper>
</template>

<i18n lang="yaml">
el:
  legal:
    lastUpdated: 'Τελευταία ενημέρωση: {date}'
    fallbackNotice: 'Το έγγραφο αυτό διατίθεται μόνο στα {language}.'
    toc:
      title: Σε αυτή τη σελίδα
    terms-of-use:
      description: Οι όροι και προϋποθέσεις που διέπουν τη χρήση της ιστοσελίδας {siteHost}.
    privacy-policy:
      description: Πώς συλλέγουμε, χρησιμοποιούμε και προστατεύουμε τα προσωπικά σας δεδομένα.
    cookies-policy:
      description: Πώς χρησιμοποιούμε τα cookies στην ιστοσελίδα μας και πώς μπορείς να τα ελέγξεις.
    return-policy:
      description: Πώς μπορείτε να ακυρώσετε ή να επιστρέψετε μια παραγγελία.
  breadcrumb:
    items:
      terms-of-use:
        label: Όροι Χρήσης
        icon: i-heroicons-user-group
      privacy-policy:
        label: Πολιτική Απορρήτου
        icon: i-heroicons-clipboard-document-list
      cookies-policy:
        label: Πολιτική Cookies
        icon: i-heroicons-shield-check
      return-policy:
        label: Πολιτική Επιστροφών
        icon: i-heroicons-arrow-uturn-left
en:
  legal:
    lastUpdated: 'Last updated: {date}'
    fallbackNotice: 'This document is available in {language} only.'
    toc:
      title: On this page
    terms-of-use:
      description: The terms and conditions that govern the use of {siteHost}.
    privacy-policy:
      description: How we collect, use and protect your personal data.
    cookies-policy:
      description: How we use cookies on our site and how you can control them.
    return-policy:
      description: How to cancel or return an order.
  breadcrumb:
    items:
      terms-of-use:
        label: Terms of Use
        icon: i-heroicons-user-group
      privacy-policy:
        label: Privacy Policy
        icon: i-heroicons-clipboard-document-list
      cookies-policy:
        label: Cookie Policy
        icon: i-heroicons-shield-check
      return-policy:
        label: Returns Policy
        icon: i-heroicons-arrow-uturn-left
</i18n>
