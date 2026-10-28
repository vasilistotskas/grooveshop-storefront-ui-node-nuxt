<script lang="ts" setup>
/**
 * Where moderation stands for the shopper's own review: published,
 * waiting for the merchant, or refused. Absent counts as waiting, as it
 * does for a review Django has not stamped yet.
 *
 * The status colours are fills: as words they fail AA on the page's
 * ground, so the tint and the icon carry the colour and the words stay
 * `text-toned`.
 */
const props = defineProps<{
  status?: ReviewStatus
}>()

const { t } = useStoreI18n('components/Product/Reviews/StatusBadge')

const MODERATION: Record<ReviewStatus, { key: string, color: 'success' | 'warning' | 'error', icon: string, iconClass: string }> = {
  TRUE: { key: 'published', color: 'success', icon: 'i-lucide-check', iconClass: 'text-success' },
  NEW: { key: 'in_review', color: 'warning', icon: 'i-lucide-clock', iconClass: 'text-warning' },
  FALSE: { key: 'rejected', color: 'error', icon: 'i-lucide-x', iconClass: 'text-error' },
}

const moderation = computed(() => MODERATION[props.status ?? 'NEW'])
</script>

<template>
  <UBadge
    :label="t(moderation.key)"
    :icon="moderation.icon"
    :color="moderation.color"
    variant="subtle"
    size="sm"
    :ui="{ base: 'text-toned', leadingIcon: moderation.iconClass }"
  />
</template>

<i18n lang="yaml">
el:
  published: Δημοσιευμένη
  in_review: Σε έλεγχο
  rejected: Δεν δημοσιεύτηκε
en:
  published: Published
  in_review: In review
  rejected: Not published
</i18n>
