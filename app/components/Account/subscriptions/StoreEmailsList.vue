<script setup lang="ts">
/**
 * "Store emails": the marketing emails the store sends without a topic
 * subscription, one switch each (`useEmailPreferences`). A store that
 * sends none shows nothing.
 */
const { t } = useStoreI18n('components/Account/subscriptions/StoreEmailsList')

const { types, error, refresh, saving, setEnabled } = useEmailPreferences()

const headingId = useId()
</script>

<template>
  <AccountLoadError
    v-if="error"
    :message="t('error')"
    @retry="refresh"
  />

  <section
    v-else-if="types.length"
    :aria-labelledby="headingId"
    class="rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
  >
    <h2
      :id="headingId"
      class="text-xs font-semibold tracking-wider text-toned uppercase"
    >
      {{ t('title') }}
    </h2>
    <p class="mt-1 text-sm text-toned">
      {{ t('lead') }}
    </p>

    <div class="mt-1 divide-y divide-default">
      <div
        v-for="type in types"
        :key="type.key"
        class="flex items-center justify-between gap-4 py-4"
      >
        <h3 class="font-semibold text-highlighted">
          {{ type.title }}
        </h3>
        <USwitch
          :model-value="type.enabled"
          :loading="saving === type.key"
          :disabled="saving !== null"
          :aria-label="type.title"
          color="secondary"
          @update:model-value="(enabled: boolean) => setEnabled(type.key, enabled)"
        />
      </div>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  title: Email του καταστήματος
  lead: Email που στέλνει το κατάστημα χωρίς συνδρομή σε θέμα. Αν διαγράφηκες από έναν σύνδεσμο σε email, μπορείς να τα ενεργοποιήσεις ξανά εδώ.
  error: Δεν μπορέσαμε να φορτώσουμε τα email του καταστήματος.
en:
  title: Store emails
  lead: Emails the store sends without a topic subscription. If you unsubscribed from a link in an email, you can turn them back on here.
  error: We could not load the store emails.
</i18n>
