<script setup lang="ts">
/**
 * webside's "Store emails": the marketing emails the store sends without a
 * topic subscription, one card each (`useEmailPreferences`). A store that
 * sends none shows nothing.
 */
const { t } = useStoreI18n('components/variants/webside/Account/subscriptions/StoreEmailsList')

const { types, error, saving, setEnabled } = useEmailPreferences()
</script>

<template>
  <UAlert
    v-if="error"
    color="error"
    variant="soft"
    icon="i-heroicons-exclamation-triangle"
    :title="t('error.title')"
    :description="t('error.description')"
  />

  <div v-else-if="types.length" class="space-y-4">
    <div class="flex items-center gap-3">
      <UIcon name="i-heroicons-envelope" class="size-6 text-primary" />
      <h3 class="text-lg font-semibold text-default">
        {{ t('title') }}
      </h3>
      <UBadge variant="soft" color="neutral" size="sm">
        {{ types.length }}
      </UBadge>
    </div>
    <p class="text-sm text-muted">
      {{ t('description') }}
    </p>

    <div
      class="
        grid grid-cols-1 gap-4
        md:grid-cols-2
        lg:grid-cols-3
      "
    >
      <UCard
        v-for="type in types"
        :key="type.key"
        variant="subtle"
        class="h-full"
      >
        <div class="flex items-center justify-between gap-4">
          <h4 class="min-w-0 truncate text-base font-semibold text-default">
            {{ type.title }}
          </h4>
          <USwitch
            :model-value="type.enabled"
            :loading="saving === type.key"
            :disabled="saving !== null"
            :aria-label="type.title"
            color="success"
            size="md"
            @update:model-value="(enabled: boolean) => setEnabled(type.key, enabled)"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Email του καταστήματος
  description: Email που στέλνει το κατάστημα χωρίς συνδρομή σε θέμα. Αν διαγραφήκατε από έναν σύνδεσμο σε email, μπορείτε να τα ενεργοποιήσετε ξανά εδώ.
  error:
    title: Σφάλμα φόρτωσης
    description: Δεν ήταν δυνατή η φόρτωση των email του καταστήματος. Παρακαλώ δοκιμάστε ξανά.
en:
  title: Store emails
  description: Emails the store sends without a topic subscription. If you unsubscribed from a link in an email, you can turn them back on here.
  error:
    title: Could not load
    description: We could not load the store emails. Please try again.
</i18n>
