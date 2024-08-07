<script lang="ts" setup>
import type { PropType } from 'vue'
import { ref, computed, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Tag } from '~/types/tag'

const { locale } = useI18n()

const props = defineProps({
  tags: {
    type: Array as PropType<Tag[] | null>,
    required: true,
  },
  search: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const { tags, search } = toRefs(props)

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
    v-if="tags && tags.length > 0"
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
            flex items-center gap-2 text-center text-md font-bold

            md:text-lg
          "
        >
          <UIcon name="i-heroicons-tag" />
          {{ $t('common.tags') }}
        </h3>
      </div>
      <template v-if="search">
        <label
          class="sr-only"
          for="search"
        >
          {{ $t('common.search.title') }}
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
          :placeholder="`${$t('common.search.title')}...`"
        />
      </template>
      <UCarousel
        v-slot="{ item }"
        :items="filteredTags"
        :ui="{
          item: 'basis-1/2 md:basis-1/3 lg:basis-1/4',
          container: 'rounded-lg gap-3',
        }"
      >
        <UButton
          color="primary"
          variant="solid"
          class="flex w-full items-center"
          icon="i-heroicons-hashtag"
          size="2xs"
          :label="extractTranslated(item, 'label', locale)"
        />
      </UCarousel>
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
