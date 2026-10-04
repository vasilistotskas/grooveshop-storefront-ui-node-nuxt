<script lang="ts" setup>
/**
 * The account's email topics: what the store may send beyond the order
 * and security emails, one switch per topic the merchant defines.
 *
 * "Always sent" is true by construction: no order, shipping or
 * authentication email consults a subscription topic.
 */
const { t } = useI18n()
useHead({ title: () => t('title') })
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader
      :title="t('title')"
      :lead="t('lead')"
    />

    <AccountSubscriptionsSubscriptionTopicsList />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Θέματα email
  lead: Διάλεξε ποια email φτάνουν στα εισερχόμενά σου. Τα email παραγγελιών και ασφάλειας στέλνονται πάντα.
en:
  title: Email topics
  lead: Choose what lands in your inbox. Order and security emails are always sent.
</i18n>
