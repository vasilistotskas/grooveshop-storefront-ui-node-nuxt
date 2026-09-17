<script lang="ts" setup>
const { t, locale } = useI18n()
const localePath = useLocalePath()
// The document is the tenant's own ContentPage — see useLegalPage for
// why this page no longer carries the platform's text as a fallback.
const { title, body, tocLinks, updatedAt, hasDocument, error }
  = useLegalPage(LEGAL_ROUTE_SLUGS['cookies-policy'])

// Same normalization as app/pages/about.vue: a backend outage is a 503,
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
    to: localePath('cookies-policy'),
    label: t('breadcrumb.items.cookies-policy.label'),
    icon: t('breadcrumb.items.cookies-policy.icon'),
    current: true,
  },
])

useSeoMeta({
  title: () => title.value,
})
useHead({
  title: () => title.value,
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
    <UPageHeader
      :title="title"
      :description="t('legal.cookies.description')"
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

    <div
      class="
        mt-6 flex flex-col gap-6
        lg:grid lg:grid-cols-[1fr_15rem] lg:items-start lg:gap-10
      "
    >
      <article
        class="
          article text-primary-950
          dark:text-primary-50
        "
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="body" />
      </article>

      <LegalToc
        :title="t('legal.toc.title')"
        :links="tocLinks"
      />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  legal:
    headline: Νομικά
    lastUpdated: 'Τελευταία ενημέρωση: {date}'
    toc:
      title: Σε αυτή τη σελίδα
    cookies:
      description: Πώς χρησιμοποιούμε τα cookies στην ιστοσελίδα μας και πώς μπορείς να τα ελέγξεις.
  breadcrumb:
    items:
      cookies-policy:
        label: Πολιτική Cookies
        icon: i-heroicons-shield-check
en:
  legal:
    headline: Legal
    lastUpdated: 'Last updated: {date}'
    toc:
      title: On this page
    cookies:
      description: How we use cookies on our site and how you can control them.
  breadcrumb:
    items:
      cookies-policy:
        label: Cookie Policy
        icon: i-heroicons-shield-check
</i18n>
