<script lang="ts" setup>
import type { PropType } from 'vue'
import { ref, computed, toRefs } from 'vue'
import type { AsyncDataRequestStatus } from '#app/composables/asyncData'

const { locale } = useI18n()
const { $i18n } = useNuxtApp()

const props = defineProps({
  tags: {
    type: Array as PropType<Tag[] | undefined>,
    default: () => [],
  },
  search: {
    type: Boolean,
    required: false,
    default: false,
  },
  status: {
    type: String as PropType<AsyncDataRequestStatus>,
    required: false,
    default: 'idle',
  },
})

const { tags, search, status } = toRefs(props)

const searchQuery = ref('')
const filteredTags = computed(() => {
  return tags?.value?.filter((tag) => {
    return extractTranslated(tag, 'label', locale.value)
      ?.toLowerCase()
      .includes(searchQuery.value.toLowerCase())
  })
})
</script>

<template>
  <aside
    v-if="tags && tags.length"
    class="grid"
  >
    <div
      class="
        flex gap-2
        md:flex-col
      "
    >
      <div
        class="
          grid items-center
          md:justify-center
        "
      >
        <h3
          class="
            text-normal flex items-center gap-2 text-center font-bold
            md:text-lg
          "
        >
          <UIcon name="i-heroicons-tag" />
          {{ $i18n.t('tags') }}
        </h3>
      </div>
      <template v-if="search">
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
      </template>
      <LazyUCarousel
        v-if="status !== 'pending'"
        v-slot="{ item }"
        :items="filteredTags"
        :ui="{
          item: 'basis-1/2 md:basis-1/3 lg:basis-1/4',
          container: 'rounded-lg gap-3',
        }"
      >
        <UButton
          color="neutral"
          variant="solid"
          class="flex w-full items-center"
          icon="i-heroicons-hashtag"
          size="xs"
          :label="extractTranslated(item, 'label', locale)"
        />
      </LazyUCarousel>
      <USkeleton
        v-if="status === 'pending'"
        class="h-6 w-full"
      />
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
