<script lang="ts" setup>
const { t } = useI18n()

definePageMeta({
  layout: 'user',
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
