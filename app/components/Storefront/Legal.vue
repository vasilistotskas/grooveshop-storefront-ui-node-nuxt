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

const breadcrumb = computed(() => [
  { label: t(`breadcrumb.items.${props.route}.label`) },
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
  <UContainer class="flex flex-col gap-6 pt-6 pb-14 lg:gap-8 lg:pb-22">
    <PageBreadcrumb :items="breadcrumb" />

    <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div class="flex min-w-0 flex-col gap-2">
        <h1
          class="
            font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em]
            text-highlighted
            lg:text-[2.25rem]/[1.1]
          "
        >
          {{ title }}
        </h1>
        <p class="max-w-prose text-toned">
          {{ description }}
        </p>
      </div>
      <UBadge
        v-if="lastUpdated"
        color="neutral"
        variant="soft"
        icon="i-lucide-clock"
        size="lg"
      >
        {{ t('legal.lastUpdated', { date: lastUpdated }) }}
      </UBadge>
    </header>

    <UAlert
      v-if="isFallback"
      color="neutral"
      variant="soft"
      icon="i-lucide-languages"
      :title="t('legal.fallbackNotice', { language: fallbackLanguageName })"
    />

    <div
      class="
        flex flex-col gap-6
        lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-12
      "
    >
      <LegalToc
        :title="t('legal.toc.title')"
        :links="tocLinks"
      />

      <!-- The document is the tenant's own HTML, notices and all: a demo
           store says so in its text, not in code. -->
      <article
        :lang="documentLocale"
        class="legal-prose max-w-3xl"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="body" />
      </article>
    </div>
  </UContainer>
</template>

<style scoped>
/* The document's own prose, not `.article`: that class is the CMS pages'
   and the frozen webside store's, and a change there reaches both. */
.legal-prose {
  color: var(--ui-text-toned);
  font-size: 1.0625rem;
  line-height: 1.75;
}

.legal-prose :deep(p),
.legal-prose :deep(ul),
.legal-prose :deep(ol),
.legal-prose :deep(blockquote),
.legal-prose :deep(table) {
  margin-block-end: 1.25rem;
}

.legal-prose :deep(h1),
.legal-prose :deep(h2),
.legal-prose :deep(h3) {
  color: var(--ui-text-highlighted);
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  /* The sticky header must not cover a heading the contents list jumped to. */
  scroll-margin-top: 7rem;
}

/* The contents list can also land on a <section id> (`buildLegalToc` uses
   the id a document already carries), so that needs the same offset. */
.legal-prose :deep(section[id]) {
  scroll-margin-top: 7rem;
}

/* An editor's h1 is a section heading: the page has its own. */
.legal-prose :deep(h1),
.legal-prose :deep(h2) {
  font-size: 1.75rem;
  margin-block: 2rem 1rem;
}

.legal-prose :deep(h2:first-child),
.legal-prose :deep(div > h2:first-child) {
  margin-block-start: 0;
}

.legal-prose :deep(h3) {
  font-size: 1.25rem;
  margin-block: 1.75rem 0.75rem;
}

.legal-prose :deep(ul),
.legal-prose :deep(ol) {
  padding-inline-start: 1.5rem;
}

.legal-prose :deep(ul) {
  list-style: disc;
}

.legal-prose :deep(ol) {
  list-style: decimal;
}

.legal-prose :deep(li) {
  margin-block-end: 0.375rem;
}

.legal-prose :deep(a) {
  color: var(--ui-text-highlighted);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.legal-prose :deep(strong) {
  color: var(--ui-text-highlighted);
}

.legal-prose :deep(table) {
  border-collapse: collapse;
  display: block;
  overflow-x: auto;
  width: 100%;
}

.legal-prose :deep(th),
.legal-prose :deep(td) {
  border: 1px solid var(--ui-border);
  padding: 0.5rem 0.75rem;
  text-align: start;
}
</style>

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
      privacy-policy:
        label: Πολιτική Απορρήτου
      cookies-policy:
        label: Πολιτική Cookies
      return-policy:
        label: Πολιτική Επιστροφών
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
      privacy-policy:
        label: Privacy Policy
      cookies-policy:
        label: Cookie Policy
      return-policy:
        label: Returns Policy
</i18n>
