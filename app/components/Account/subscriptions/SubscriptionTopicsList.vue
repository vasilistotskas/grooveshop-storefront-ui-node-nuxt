<script setup lang="ts">
const { t } = useI18n()

// Fetch data at component setup level using composables
const { fetchTopics, groupByCategory } = useSubscriptionTopics()
const { fetchSubscriptions, subscribe, unsubscribe } = useUserSubscriptions()

// Call composable methods at setup level and destructure AsyncData results
const { data: topics, status: topicsStatus, error: topicsError, refresh: refreshTopics } = fetchTopics()
const { data: subscriptions, status: subscriptionsStatus, error: subscriptionsError, refresh: refreshSubscriptions } = fetchSubscriptions()

// Compute loading state from status values
const loading = computed(() => topicsStatus.value === 'pending' || subscriptionsStatus.value === 'pending')
const error = computed(() => topicsError.value || subscriptionsError.value)
const retry = () => Promise.all([refreshTopics(), refreshSubscriptions()])
const hasTopics = computed(() => topics.value && topics.value.length > 0)

// Use helper function with data arrays
const groupedByCategory = computed(() => groupByCategory(topics.value))

const categoriesWithTopics = computed(() => {
  return Object.entries(groupedByCategory.value)
    .filter(([_, topics]) => topics.length > 0)
    .map(([category]) => category as TopicCategory)
})

const handleSubscribe = async (topicId: number) => {
  try {
    await subscribe(topicId)
  }
  catch (err) {
    log.error({ action: 'subscription:subscribe', error: err })
  }
}

const handleUnsubscribe = async (subscriptionId: number) => {
  try {
    await unsubscribe(subscriptionId)
  }
  catch (err) {
    log.error({ action: 'subscription:unsubscribe', error: err })
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <template v-if="loading && !hasTopics">
      <USkeleton
        v-for="i in 2"
        :key="i"
        class="h-48 rounded-[1.25rem]"
      />
    </template>

    <AccountLoadError
      v-else-if="error"
      :message="t('error.title')"
      @retry="retry"
    />

    <div
      v-else-if="!hasTopics"
      class="
        flex flex-col gap-1 rounded-[1.25rem] bg-default p-6 ring ring-default
      "
    >
      <h2 class="font-semibold text-highlighted">
        {{ t('empty.title') }}
      </h2>
      <p class="text-sm text-toned">
        {{ t('empty.description') }}
      </p>
    </div>

    <template v-else>
      <AccountSubscriptionsSubscriptionCategoryGroup
        v-for="category in categoriesWithTopics"
        :key="category"
        :category="category"
        :topics="groupedByCategory[category] || []"
        :subscriptions="subscriptions || []"
        @subscribe="handleSubscribe"
        @unsubscribe="handleUnsubscribe"
      />
    </template>
  </div>
</template>

<i18n lang="yaml">
el:
  error:
    title: Δεν μπορέσαμε να φορτώσουμε τα θέματα email.
  empty:
    title: Δεν υπάρχουν διαθέσιμα θέματα
    description: Δεν υπάρχουν θέματα ειδοποιήσεων διαθέσιμα αυτή τη στιγμή. Παρακαλώ ελέγξτε ξανά αργότερα.
en:
  error:
    title: We could not load the email topics.
  empty:
    title: No topics available
    description: There are no notification topics right now. Please check back later.
</i18n>
