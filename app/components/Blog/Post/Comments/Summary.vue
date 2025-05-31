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

const { $i18n } = useNuxtApp()
</script>

<template>
  <span>
    {{
      $i18n.t('comments.count', {
        count: commentsCount,
      })
    }}
  </span>
</template>
