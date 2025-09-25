<script lang="ts" setup generic="T extends ProductMeiliSearchResult | BlogPostMeiliSearchResult">
const props = defineProps<{
  item: T
  highlighted: boolean
}>()

const { item } = toRefs(props)
const emit = defineEmits(['click', 'mousedown', 'mouseover'])

const { t } = useI18n()
const { productUrl, blogPostUrl } = useUrls()

const getPath = computed(() => {
  switch (item.value.type) {
    case 'product':
      return productUrl(item.value.id, item.value.slug)
    case 'blogPost':
      return blogPostUrl(item.value.id, item.value.slug)
    default:
      return ''
  }
})

const sortedFields = computed(() => {
  if (!item.value) return []
  if (!item.value.formatted) return []

  const fields = Object.entries(item.value.formatted).filter(
    ([key]) => key !== 'languageCode' && key !== 'id',
  )

  return fields.map(([key, value]) => [key, value ? stripHtml(String(value)) : ''])
})
</script>

<template>
  <li
    class="
      rounded-sm border border-primary-300 bg-primary-100
      hover:bg-primary-200
      dark:border-primary-500 dark:bg-primary-900 dark:hover:bg-primary-800
    "
  >
    <Anchor
      :class="{ 'bg-primary-200 dark:bg-primary-800': highlighted }"
      :to="{ path: getPath }"
      class="
        flex gap-1 p-2
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
          :alt="String(item.id)"
          :modifiers="{
            position: 'attention',
            trimThreshold: 5,
          }"
          densities="x1"
        />
        <div
          v-if="sortedFields && sortedFields.length > 0"
          class="grid overflow-hidden"
        >
          <div
            v-for="([key, value], index) in sortedFields"
            :key="index"
          >
            <span
              v-if="key"
              class="
                text-sm font-semibold text-primary-950
                dark:text-primary-50
              "
            >
              {{ t(`fields.${key}`) }}:
            </span>
            <span
              v-if="value"
              class="
                line-clamp-1 text-sm text-primary-950
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

<i18n lang="yaml">
el:
  fields:
    title: Τίτλος
    subtitle: Περιγραφή
    body: Περιγραφή
    likesCount: likes
</i18n>
