<script lang="ts" setup>
const props = defineProps({
  max: {
    type: Number,
    default: 6,
  },
})

const { max } = toRefs(props)
const { locale } = useI18n()
const { resolveImageSrc } = useImageResolver()
const { contentShorten } = useText()

const { data: categories } = await useLazyFetch(`/api/blog/categories`, {
  key: `blogCategories`,
  method: 'GET',
  query: {
    pageSize: max.value,
  },
})

const categoryResults = ref(categories.value?.results)
</script>

<template>
  <UCarousel
    v-if="categoryResults && categoryResults?.length > 1"
    v-slot="{ item }"
    :items="categoryResults"
    :ui="{ item: 'basis-[33%]', container: 'gap-3' }"
    class="overflow-hidden"
  >
    <UButton
      class="w-full !p-2 font-bold"
      color="secondary"
      :label="contentShorten(extractTranslated(item, 'name', locale), 0, 6)"
      :to="`/blog/category/${item?.id}/${item?.slug}`"
      size="lg"
      :ui="{
        rounded: 'rounded-lg',
        color: {
          secondary: {
            solid: 'shadow-sm bg-secondary dark:bg-secondary-dark text-white',
          },
        },
      }"
    >
      <template #leading>
        <ImgWithFallback
          provider="mediaStream"
          :width="25"
          :height="25"
          :fit="'fill'"
          :position="'entropy'"
          :background="'ffffff'"
          :trim-threshold="5"
          :src="
            resolveImageSrc(
              item?.mainImageFilename,
              `media/uploads/blog/${item?.mainImageFilename}`,
            )
          "
          ::alt="`Image - ${extractTranslated(item, 'name', locale)}`"
          densities="x1"
        />
      </template>
    </UButton>
  </UCarousel>
</template>
