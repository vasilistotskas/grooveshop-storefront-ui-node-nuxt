<script lang="ts" setup>
const props = defineProps<{
  result: SearchResult
}>()

const emit = defineEmits<{
  click: []
}>()

const { productUrl, blogPostUrl } = useUrls()

const contentTypeInfo = computed(() => {
  if (props.result.contentType === 'product') {
    return {
      icon: 'i-lucide-shopping-bag',
      color: 'neutral' as const,
      label: 'Προϊόν',
    }
  }
  return {
    icon: 'i-lucide-file-text',
    color: 'secondary' as const,
    label: 'Άρθρο',
  }
})

const displayTitle = computed(() => getDisplayTitle(props.result))
const displaySubtitle = computed(() => getDisplaySubtitle(props.result))

const resultUrl = (result: SearchResult) => {
  if (result.contentType === 'product') {
    return productUrl(result.master, result.slug)
  }
  else if (result.contentType === 'blog_post') {
    return blogPostUrl(result.master, result.slug)
  }
}
</script>

<template>
  <UButton
    variant="ghost"
    size="lg"
    block
    :to="resultUrl(result)"
    @click="emit('click')"
  >
    <span
      class="
        flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden
        rounded-lg bg-gray-100
        dark:bg-gray-800
      "
    >
      <ImgWithFallback
        v-if="result.mainImagePath"
        :src="result.mainImagePath"
        :alt="displayTitle"
        class="h-full w-full object-cover"
        width="64"
        height="64"
        loading="lazy"
      />
      <UIcon
        v-else
        :name="contentTypeInfo.icon"
        class="size-8 text-gray-400"
      />
    </span>

    <span class="min-w-0 flex-1">
      <span class="mb-1 flex items-start justify-between gap-2">
        <h3
          class="
            line-clamp-1 font-medium text-gray-900 transition-colors
            group-hover:text-primary-600
            dark:text-gray-100 dark:group-hover:text-primary-400
          "
          v-html="displayTitle"
        />
        <UBadge
          :label="contentTypeInfo.label"
          :color="contentTypeInfo.color"
          variant="subtle"
          size="sm"
        />
      </span>

      <span
        class="
          line-clamp-2 text-sm text-gray-600
          dark:text-gray-400
        "
        v-html="displaySubtitle"
      />
    </span>

    <UIcon
      name="i-lucide-arrow-right"
      class="
        size-5 shrink-0 text-gray-400 transition-all duration-150
        group-hover:translate-x-1 group-hover:text-gray-600
        dark:group-hover:text-gray-300
      "
    />
  </UButton>
</template>
