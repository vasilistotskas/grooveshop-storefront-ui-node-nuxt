<script lang="ts" setup>
defineProps({
	commentsCount: {
		type: Number,
		required: false,
		default: 0
	},
	maxRate: {
		type: Number,
		required: false,
		default: 10
	}
})
</script>

<template>
  <div class="flex items-center justify-center gap-8">
    <div class="flex items-center gap-1">
      <span class="text-sm font-semibold text-yellow-600">
        {{ $t('components.blog.post.comments.summary.comments', commentsCount) }}
      </span>
    </div>
  </div>
</template>
