<script lang="ts" setup>
/**
 * A blog post found by the search page: its picture and its title, one
 * link. The board's category badge is left out — the search payload
 * carries no category.
 */
defineProps<{
  post: BlogPostMeiliSearchResult
}>()

const emit = defineEmits<{
  click: []
}>()

const localePath = useLocalePath()
const { blogPostUrl } = useUrls()
</script>

<template>
  <NuxtLink
    :to="localePath({ path: blogPostUrl(post.master, post.slug) })"
    class="
      flex items-center gap-3.5 rounded-2xl border border-default bg-default
      p-3 transition-colors
      hover:border-accented
    "
    @click="emit('click')"
  >
    <span class="size-18 shrink-0 overflow-hidden rounded-[0.875rem] bg-elevated">
      <ImgWithFallback
        :src="post.mainImagePath"
        alt=""
        :width="144"
        :height="144"
        fit="cover"
        :modifiers="{ position: 'attention' }"
        loading="lazy"
        class="size-full object-cover"
      />
    </span>
    <strong class="line-clamp-3 text-[0.9375rem]/[1.3] font-bold text-highlighted">
      {{ post.title }}
    </strong>
  </NuxtLink>
</template>
