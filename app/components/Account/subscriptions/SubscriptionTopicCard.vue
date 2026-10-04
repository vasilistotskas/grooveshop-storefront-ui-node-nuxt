<script setup lang="ts">
/**
 * One topic as a row of its category's card: its name and description,
 * and the switch that subscribes or unsubscribes at once.
 */
const { t, locale } = useI18n()

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
const timeoutId = ref<ReturnType<typeof setTimeout> | null>(null)

const isToggling = computed(() => props.loading || localLoading.value)
const name = computed(() => props.topic.translations[locale.value]?.name || props.topic.slug)
const description = computed(() => props.topic.translations[locale.value]?.description)

const handleToggle = (checked: boolean) => {
  if (isToggling.value) return

  localLoading.value = true

  if (checked) {
    emit('subscribe')
  }
  else {
    emit('unsubscribe')
  }

  if (timeoutId.value) clearTimeout(timeoutId.value)
  timeoutId.value = setTimeout(() => {
    localLoading.value = false
    timeoutId.value = null
  }, 500)
}

onBeforeUnmount(() => {
  if (timeoutId.value) clearTimeout(timeoutId.value)
})
</script>

<template>
  <div class="flex items-center justify-between gap-4 py-4">
    <div class="flex min-w-0 flex-col gap-0.5">
      <h3 class="font-semibold text-highlighted">
        {{ name }}
      </h3>
      <p
        v-if="description"
        class="text-sm text-toned"
      >
        {{ description }}
      </p>
      <p
        v-if="topic.requiresConfirmation"
        class="text-xs text-toned"
      >
        {{ t('requiresConfirmation') }}
      </p>
    </div>
    <USwitch
      :model-value="isSubscribed"
      :loading="isToggling"
      :disabled="isToggling"
      :aria-label="name"
      color="secondary"
      @update:model-value="handleToggle"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  requiresConfirmation: Απαιτείται επιβεβαίωση email
en:
  requiresConfirmation: Email confirmation required
</i18n>
