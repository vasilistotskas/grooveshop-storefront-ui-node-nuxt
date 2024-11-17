<script lang="ts" setup>
const { locale } = useI18n()

const { data: blogTags } = await useAsyncData<BlogTag[]>('blogTags', () =>
  $fetch<BlogTag[]>('/api/blog/tags', {
    method: 'GET',
    query: {
      active: 'true',
      pagination: 'false',
      language: locale.value,
    },
  }),
)

const searchQuery = ref('')
const filteredTags = computed(() => {
  return blogTags?.value?.filter((tag) => {
    return extractTranslated(tag, 'name', locale.value)
      ?.toLowerCase()
      .includes(searchQuery.value.toLowerCase())
  })
})
</script>

<template>
  <aside
    v-if="blogTags && blogTags.length > 0"
    class="
      row-start-1 hidden

      lg:grid

      md:row-start-2
    "
  >
    <div
      class="
        flex gap-4

        md:flex-col
      "
    >
      <div
        class="
          grid items-center

          md:justify-center
        "
      >
        <h3 class="flex items-center gap-2 text-center text-2xl font-bold">
          <UIcon name="i-heroicons-tag" />
          {{ $t('tags') }}
        </h3>
      </div>
      <label
        class="sr-only"
        for="search"
      >
        {{ $t('search.title') }}
      </label>
      <UInput
        id="search"
        v-model="searchQuery"
        name="search"
        icon="i-heroicons-magnifying-glass-20-solid"
        class="
          hidden

          md:grid
        "
        color="primary"
        :trailing="false"
        variant="outline"
        :placeholder="`${$t('search.title')}...`"
      />
      <ul
        v-if="filteredTags && filteredTags.length > 0"
        class="
          scrollable-tags grid items-center

          md:gap-4
        "
      >
        <li
          v-for="tag in filteredTags"
          :key="tag.id"
        >
          <UButton
            color="primary"
            variant="solid"
            class="flex w-full items-center"
            icon="i-heroicons-hashtag"
            :label="extractTranslated(tag, 'name', locale)"
          />
        </li>
      </ul>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.scrollable-tags {
  @media screen and (min-width: 768px) {
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>
