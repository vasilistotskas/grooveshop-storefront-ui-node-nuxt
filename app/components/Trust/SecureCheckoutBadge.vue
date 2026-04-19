<script lang="ts" setup>
/**
 * "Secure checkout" seal — small inline lock icon + copy.
 *
 * Signals SSL/HTTPS protection and links to the return policy so the
 * trust row carries both halves of the common e-commerce reassurance
 * (secure payment + buyer protection).
 */

const { t } = useI18n()
const localePath = useLocalePath()

defineProps<{
  compact?: boolean
}>()
</script>

<template>
  <div class="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
    <UIcon
      name="i-heroicons-lock-closed"
      class="h-4 w-4 shrink-0 text-success"
      aria-hidden="true"
    />
    <span>
      <span class="font-semibold text-neutral-800 dark:text-neutral-100">
        {{ t('title') }}
      </span>
      <template v-if="!compact">
        ·
        <NuxtLink
          :to="localePath('return-policy')"
          class="underline hover:text-(--ui-secondary)"
        >
          {{ t('returns_link') }}
        </NuxtLink>
      </template>
    </span>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Ασφαλής πληρωμή SSL
  returns_link: 14 ημέρες πολιτική επιστροφών
</i18n>
