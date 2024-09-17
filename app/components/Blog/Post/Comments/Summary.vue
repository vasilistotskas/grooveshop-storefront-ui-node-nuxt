<script lang="ts" setup>
defineProps({
  commentsCount: {
    type: Number,
    required: false,
    default: 0,
  },
  maxRate: {
    type: Number,
    required: false,
    default: 10,
  },
})

const { t } = useI18n({ useScope: 'local' })
</script>

<template>
  <div class="flex items-center justify-center gap-8">
    <div class="flex items-center gap-1">
      <span
        class="
          text-sm font-semibold text-secondary

          dark:text-secondary-dark
        "
      >
        {{
          t('comments.count', commentsCount)
        }}
      </span>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  comments:
    count: Κανένα σχόλιο | 1 σχόλιο | %{count} Σχόλια
</i18n>
