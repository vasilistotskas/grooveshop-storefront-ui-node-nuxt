<script lang="ts" setup>
/**
 * An account list that could not load, said as that and not as an empty
 * list: a shopper with orders must never read "no orders yet" because a
 * request failed. Offers to try again.
 */
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  retry: []
}>()

const { t } = useI18n()
</script>

<template>
  <div
    role="alert"
    class="flex flex-col items-start gap-3 rounded-[1.25rem] bg-default p-6 ring ring-default"
  >
    <p class="font-semibold text-highlighted">
      {{ message }}
    </p>
    <UButton
      :label="t('retry')"
      icon="i-lucide-refresh-cw"
      color="neutral"
      variant="outline"
      size="sm"
      @click="() => emit('retry')"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  retry: Δοκίμασε ξανά
en:
  retry: Try again
</i18n>
