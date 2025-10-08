<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  topic: SubscriptionTopic
  isSubscribed: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  subscribe: []
  unsubscribe: []
}>()

const localLoading = ref(false)

const isToggling = computed(() => props.loading || localLoading.value)

const handleToggle = (checked: boolean) => {
  if (isToggling.value) return

  localLoading.value = true

  if (checked) {
    emit('subscribe')
  }
  else {
    emit('unsubscribe')
  }

  setTimeout(() => {
    localLoading.value = false
  }, 500)
}

const categoryColor = computed(() => {
  const colorMap: Record<CategoryEnum, 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
    MARKETING: 'primary',
    PRODUCT: 'info',
    ACCOUNT: 'secondary',
    SYSTEM: 'warning',
    NEWSLETTER: 'success',
    PROMOTIONAL: 'error',
    OTHER: 'neutral',
  }
  return props.topic.category ? colorMap[props.topic.category] : 'neutral'
})

const categoryLabel = computed(() => {
  return props.topic.category ? t(`categories.${props.topic.category}`) : t('categories.OTHER')
})
</script>

<template>
  <UCard variant="subtle" class="h-full">
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-base font-semibold text-default">
            {{ topic.translations.el?.name || topic.slug }}
          </h3>
          <div class="mt-1 flex items-center gap-2">
            <UBadge
              v-if="topic.category"
              :color="categoryColor"
              variant="soft"
              size="sm"
            >
              {{ categoryLabel }}
            </UBadge>
            <UBadge
              variant="subtle"
              color="neutral"
              size="sm"
              :icon="'i-heroicons-users'"
            >
              {{ topic.subscriberCount }}
            </UBadge>
          </div>
        </div>
        <USwitch
          :model-value="isSubscribed"
          :loading="isToggling"
          :disabled="isToggling"
          color="success"
          size="md"
          @update:model-value="handleToggle"
        />
      </div>
    </template>

    <div class="text-sm text-muted">
      {{ topic.translations.el?.description || t('noDescription') }}
    </div>

    <template v-if="topic.requiresConfirmation" #footer>
      <div class="flex items-center gap-2 text-xs text-muted">
        <UIcon name="i-heroicons-information-circle" class="size-4" />
        <span>{{ t('requiresConfirmation') }}</span>
      </div>
    </template>
  </UCard>
</template>

<i18n lang="yaml">
el:
  noDescription: Χωρίς περιγραφή
  requiresConfirmation: Απαιτείται επιβεβαίωση email
  categories:
    MARKETING: Μάρκετινγκ
    PRODUCT: Προϊόντα
    ACCOUNT: Λογαριασμός
    SYSTEM: Σύστημα
    NEWSLETTER: Ενημερωτικό Δελτίο
    PROMOTIONAL: Προωθητικά
    OTHER: Άλλο
</i18n>
