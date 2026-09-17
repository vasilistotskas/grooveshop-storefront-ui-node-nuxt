<script lang="ts" setup>
const { t, locale } = useI18n()
const localePath = useLocalePath()

// The fourth legal route, and until now the only one that never rendered
// its document: this page was a 41-line stub with an empty <div />,
// while `return-policy` sat in LEGAL_ROUTE_SLUGS alongside the three
// that did. That was harmless only while nothing pointed here — the
// moment /info/<slug> started redirecting to its canonical route, the
// redirect landed visitors on a blank page and the merchant's published
// returns policy became unreachable.
const { title, body, tocLinks, updatedAt, hasDocument, error }
  = await useLegalPage(LEGAL_ROUTE_SLUGS['return-policy'])

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
        day: 'numeric',
        month: 'long',
        year: 'numeric',
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
    to: localePath('return-policy'),
    label: t('breadcrumb.items.return-policy.label'),
    icon: t('breadcrumb.items.return-policy.icon'),
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
      :description="t('legal.returnPolicy.description')"
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
    lastUpdated: 'Τελευταία ενημέρωση: {date}'
    toc:
      title: Σε αυτή τη σελίδα
    returnPolicy:
      description: Πώς μπορείτε να ακυρώσετε ή να επιστρέψετε μια παραγγελία.
  breadcrumb:
    items:
      return-policy:
        label: Πολιτική Επιστροφών
        icon: i-heroicons-arrow-uturn-left
en:
  legal:
    lastUpdated: 'Last updated: {date}'
    toc:
      title: On this page
    returnPolicy:
      description: How to cancel or return an order.
  breadcrumb:
    items:
      return-policy:
        label: Returns Policy
        icon: i-heroicons-arrow-uturn-left
</i18n>
