<script lang="ts" setup>
definePageMeta({
  middleware: ['newsletter-enabled'],
})

const { t } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })

defineRouteRules({
  robots: false,
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <PageTitle
      :text="t('title')"
      class="md:mt-0"
    />

    <div class="mb-2 text-sm text-muted">
      {{ t('description') }}
    </div>

    <AccountSubscriptionsSubscriptionTopicsList />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Ειδοποιήσεις & Συνδρομές
  description: Διαχειριστείτε τις προτιμήσεις ειδοποιήσεών σας. Επιλέξτε τα θέματα για τα οποία θέλετε να λαμβάνετε ειδοποιήσεις.
</i18n>
