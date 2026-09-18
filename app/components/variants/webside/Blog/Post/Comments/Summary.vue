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

const { t } = useI18n()
</script>

<template>
  <span>
    {{
      t('comments.count', {
        count: commentsCount,
      })
    }}
  </span>
</template>
