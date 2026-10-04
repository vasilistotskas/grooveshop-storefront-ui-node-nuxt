<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  category: TopicCategory
  topics: SubscriptionTopic[]
  subscriptions: UserSubscription[]
}>()

const emit = defineEmits<{
  subscribe: [topicId: number]
  unsubscribe: [subscriptionId: number]
}>()

const headingId = useId()

const categoryLabel = computed(() => {
  return t(`categories.${props.category}`)
})

// The composable's rule: a row Django keeps after an unsubscribe link or
// a bounce is no subscription, and its switch reads off.
const { isSubscribed, getSubscriptionByTopicId } = useUserSubscriptions()
const isTopicSubscribed = (topicId: number) => isSubscribed(props.subscriptions, topicId)
const getSubscriptionId = (topicId: number) => getSubscriptionByTopicId(props.subscriptions, topicId)?.id

const handleSubscribe = (topicId: number) => {
  emit('subscribe', topicId)
}

const handleUnsubscribe = (topicId: number) => {
  const subscriptionId = getSubscriptionId(topicId)
  if (subscriptionId) {
    emit('unsubscribe', subscriptionId)
  }
}
</script>

<template>
  <section
    :aria-labelledby="headingId"
    class="rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
  >
    <h2
      :id="headingId"
      class="text-xs font-semibold tracking-wider text-toned uppercase"
    >
      {{ categoryLabel }}
    </h2>

    <div class="mt-1 divide-y divide-default">
      <AccountSubscriptionsSubscriptionTopicCard
        v-for="topic in topics"
        :key="topic.id"
        :topic="topic"
        :is-subscribed="isTopicSubscribed(topic.id)"
        @subscribe="handleSubscribe(topic.id)"
        @unsubscribe="handleUnsubscribe(topic.id)"
      />
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  categories:
    MARKETING: Μάρκετινγκ
    PRODUCT: Προϊόντα
    ACCOUNT: Λογαριασμός
    SYSTEM: Σύστημα
    NEWSLETTER: Ενημερωτικό Δελτίο
    PROMOTIONAL: Προωθητικά
    OTHER: Άλλο
en:
  categories:
    MARKETING: Marketing
    PRODUCT: Products
    ACCOUNT: Account
    SYSTEM: System
    NEWSLETTER: Newsletter
    PROMOTIONAL: Promotions
    OTHER: Other
</i18n>
