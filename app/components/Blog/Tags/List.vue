<script lang="ts" setup>
const { locale } = useI18n()
const { $i18n } = useNuxtApp()

const { data: blogTags } = await useFetch(
  '/api/blog/tags',
  {
    key: 'blogTags',
    method: 'GET',
    headers: useRequestHeaders(),
  },
)

const searchQuery = ref('')
const filteredTags = computed(() => {
  return blogTags?.value?.results?.filter((tag) => {
    return extractTranslated(tag, 'name', locale.value)
      ?.toLowerCase()
      .includes(searchQuery.value.toLowerCase())
  })
})
</script>

<template>
  <aside
    v-if="blogTags && blogTags.count > 0"
    class="
      row-start-1 hidden
      md:row-start-2
      lg:grid
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
          {{ $i18n.t('tags') }}
        </h3>
      </div>
      <label
        class="sr-only"
        for="search"
      >
        {{ $i18n.t('search.title') }}
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
        color="neutral"
        :trailing="false"
        variant="outline"
        :placeholder="`${$i18n.t('search.title')}...`"
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
            color="neutral"
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

<style scoped>
.scrollable-tags {
  @media screen and (min-width: 768px) {
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>
