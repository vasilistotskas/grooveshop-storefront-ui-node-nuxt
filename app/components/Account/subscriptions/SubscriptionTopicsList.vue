<script setup lang="ts">
const { t } = useI18n()

const { topics, loading: topicsLoading, error: topicsError, fetchTopics, groupedByCategory } = useSubscriptionTopics()
const { subscriptions, loading: subscriptionsLoading, error: subscriptionsError, fetchSubscriptions, subscribe, unsubscribe } = useUserSubscriptions()

const loading = computed(() => topicsLoading.value || subscriptionsLoading.value)
const error = computed(() => topicsError.value || subscriptionsError.value)
const hasTopics = computed(() => topics.value.length > 0)

const categoriesWithTopics = computed(() => {
  return Object.entries(groupedByCategory.value)
    .filter(([_, topics]) => topics.length > 0)
    .map(([category]) => category as CategoryEnum)
})

const handleSubscribe = async (topicId: number) => {
  try {
    await subscribe(topicId)
  }
  catch (err) {
    console.error('Failed to subscribe:', err)
  }
}

const handleUnsubscribe = async (subscriptionId: number) => {
  try {
    await unsubscribe(subscriptionId)
  }
  catch (err) {
    console.error('Failed to unsubscribe:', err)
  }
}

onMounted(async () => {
  await Promise.all([
    fetchTopics(),
    fetchSubscriptions(),
  ])
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading && !hasTopics" class="space-y-6">
      <div v-for="i in 3" :key="i" class="space-y-4">
        <div class="flex items-center gap-3">
          <USkeleton class="size-10 rounded-md" />
          <USkeleton class="h-10 w-32 rounded-md" />
          <USkeleton class="h-8 w-8 rounded-full" />
        </div>
        <div
          class="
            grid grid-cols-1 gap-4
            md:grid-cols-2
            lg:grid-cols-3
          "
        >
          <USkeleton v-for="j in 3" :key="j" class="h-52 rounded-lg" />
        </div>
      </div>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      :title="t('error.title')"
      :description="error.message || t('error.description')"
    />

    <div
      v-else-if="!hasTopics"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <UIcon name="i-heroicons-bell-slash" class="mb-4 size-16 text-muted" />
      <h3 class="mb-2 text-lg font-semibold text-default">
        {{ t('empty.title') }}
      </h3>
      <p class="max-w-md text-sm text-muted">
        {{ t('empty.description') }}
      </p>
    </div>

    <div v-else class="space-y-8">
      <AccountSubscriptionsSubscriptionCategoryGroup
        v-for="category in categoriesWithTopics"
        :key="category"
        :category="category"
        :topics="groupedByCategory[category] || []"
        :subscriptions="subscriptions"
        @subscribe="handleSubscribe"
        @unsubscribe="handleUnsubscribe"
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  error:
    title: Σφάλμα φόρτωσης
    description: Δεν ήταν δυνατή η φόρτωση των θεμάτων ειδοποιήσεων. Παρακαλώ δοκιμάστε ξανά.
  empty:
    title: Δεν υπάρχουν διαθέσιμα θέματα
    description: Δεν υπάρχουν θέματα ειδοποιήσεων διαθέσιμα αυτή τη στιγμή. Παρακαλώ ελέγξτε ξανά αργότερα.
</i18n>
