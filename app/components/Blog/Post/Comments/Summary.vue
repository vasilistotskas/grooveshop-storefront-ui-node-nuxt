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
  <span>
    {{
      t('comments.count', commentsCount)
    }}
  </span>
</template>

<i18n lang="yaml">
el:
  comments:
    count: Κανένα σχόλιο | 1 σχόλιο | {count} Σχόλια
</i18n>
