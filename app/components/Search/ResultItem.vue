<script lang="ts" setup>
const isSearchProduct = (item: SearchProduct | SearchBlogPost): item is SearchProduct => {
  return item.formatted !== undefined && item.formatted !== null && 'name' in item.formatted
}

const isSearchBlogPost = (item: SearchProduct | SearchBlogPost): item is SearchBlogPost => {
  return item.formatted !== undefined && item.formatted !== null && 'title' in item.formatted
}

const props = defineProps<{
  item: SearchProduct | SearchBlogPost
  highlighted: boolean
}>()

const { item } = toRefs(props)
const emit = defineEmits(['click', 'mousedown', 'mouseover'])

const { $i18n } = useNuxtApp()

const sortedFields = computed(() => {
  if (!item.value) return []
  if (!item.value.formatted) return []

  const fields = Object.entries(item.value.formatted).filter(
    ([key]) => key !== 'languageCode' && key !== 'id',
  )

  if (isSearchProduct(item.value)) {
    fields.sort(([keyA], [keyB]) => (keyA === 'name' ? -1 : keyB === 'name' ? 1 : 0))
  }
  else if (isSearchBlogPost(item.value)) {
    fields.sort(([keyA], [keyB]) => (keyA === 'title' ? -1 : keyB === 'title' ? 1 : 0))
  }

  return fields.map(([key, value]) => [key, value ? stripHtml(value) : ''])
})

const imgAlt = computed(() => {
  if (isSearchProduct(item.value)) {
    return item.value.formatted?.name
  }
  else if (isSearchBlogPost(item.value)) {
    return item.value.formatted?.title
  }
  return ''
})
</script>

<template>
  <li
    class="
      border-primary-300 bg-primary-100 rounded-sm border

      dark:bg-primary-900 dark:hover:bg-primary-800 dark:border-primary-500

      hover:bg-primary-200
    "
  >
    <Anchor
      :class="{ 'bg-primary-200 dark:bg-primary-800': highlighted }"
      :to="{ path: `/products/${item.id}` }"
      class="
        focusable flex gap-1 p-2

        md:gap-3
      "
      :prefetch-on="{ visibility: false, interaction: true }"
      @click="() => emit('click')"
      @mousedown="() => emit('mousedown')"
      @mouseover="() => emit('mouseover')"
    >
      <div class="flex gap-4">
        <ImgWithFallback
          class="object-contain"
          loading="lazy"
          :width="100"
          :height="90"
          fit="cover"
          :background="'transparent'"
          :src="item.mainImagePath"
          :alt="imgAlt"
          :modifiers="{
            position: 'attention',
            trimThreshold: 5,
          }"
          densities="x1"
        />
        <div
          v-if="sortedFields && sortedFields.length > 0" class="
            grid overflow-hidden
          "
        >
          <div v-for="([key, value], index) in sortedFields" :key="index">
            <span
              v-if="key"
              class="
                text-primary-950 text-sm font-semibold

                dark:text-primary-50
              "
            >
              {{ $i18n.t(`fields.${key}`) }}:
            </span>
            <span
              v-if="value"
              class="
                text-primary-950 line-clamp-1 text-sm

                dark:text-primary-50
              "
            >
              {{ value }}
            </span>
          </div>
        </div>
      </div>
    </Anchor>
  </li>
</template>
