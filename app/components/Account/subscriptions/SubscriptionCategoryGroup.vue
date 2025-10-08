<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  category: CategoryEnum
  topics: SubscriptionTopic[]
  subscriptions: UserSubscription[]
}>()

const emit = defineEmits<{
  subscribe: [topicId: number]
  unsubscribe: [subscriptionId: number]
}>()

const categoryLabel = computed(() => {
  return t(`categories.${props.category}`)
})

const categoryIcon = computed(() => {
  const iconMap: Record<CategoryEnum, string> = {
    MARKETING: 'i-heroicons-megaphone',
    PRODUCT: 'i-heroicons-cube',
    ACCOUNT: 'i-heroicons-user-circle',
    SYSTEM: 'i-heroicons-cog-6-tooth',
    NEWSLETTER: 'i-heroicons-newspaper',
    PROMOTIONAL: 'i-heroicons-gift',
    OTHER: 'i-heroicons-ellipsis-horizontal-circle',
  }
  return iconMap[props.category] || 'i-heroicons-ellipsis-horizontal-circle'
})

const isTopicSubscribed = (topicId: number): boolean => {
  return props.subscriptions.some(sub => sub.topic === topicId)
}

const getSubscriptionId = (topicId: number): number | undefined => {
  return props.subscriptions.find(sub => sub.topic === topicId)?.id
}

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
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <UIcon :name="categoryIcon" class="size-6 text-primary" />
      <h3 class="text-lg font-semibold text-default">
        {{ categoryLabel }}
      </h3>
      <UBadge variant="soft" color="neutral" size="sm">
        {{ topics.length }}
      </UBadge>
    </div>

    <div
      class="
        grid grid-cols-1 gap-4
        md:grid-cols-2
        lg:grid-cols-3
      "
    >
      <AccountSubscriptionsSubscriptionTopicCard
        v-for="topic in topics"
        :key="topic.id"
        :topic="topic"
        :is-subscribed="isTopicSubscribed(topic.id)"
        @subscribe="handleSubscribe(topic.id)"
        @unsubscribe="handleUnsubscribe(topic.id)"
      />
    </div>
  </div>
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
</i18n>
