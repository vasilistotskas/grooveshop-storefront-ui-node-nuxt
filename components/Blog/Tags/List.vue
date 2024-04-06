<script lang="ts" setup>
const { locale } = useI18n()

const { data: blogTags } = await useLazyAsyncData('blogTags', () =>
  $fetch('/api/blog/tags', {
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
  <aside class="row-start-1 hidden md:row-start-2 lg:grid">
    <div class="flex gap-4 md:flex-col">
      <div class="grid items-center md:justify-center">
        <h3 class="flex items-center gap-2 text-center text-2xl font-bold">
          <UIcon name="i-heroicons-tag" />
          {{ $t('common.tags') }}
        </h3>
      </div>
      <label class="sr-only" for="search">
        {{ $t('common.search') }}
      </label>
      <UInput
        id="search"
        v-model="searchQuery"
        name="search"
        icon="i-heroicons-magnifying-glass-20-solid"
        class="hidden md:grid"
        color="white"
        :trailing="false"
        variant="outline"
        :placeholder="`${$t('common.search')}...`"
      />
      <ul
        v-if="filteredTags && filteredTags.length > 0"
        class="scrollable-tags grid items-center md:gap-4"
      >
        <li v-for="tag in filteredTags" :key="tag.id">
          <UButton
            color="white"
            variant="solid"
            class="flex w-full items-center"
          >
            <UIcon name="i-heroicons-hashtag" />{{
              extractTranslated(tag, 'name', locale)
            }}
          </UButton>
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
