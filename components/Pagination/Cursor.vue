<script lang="ts" setup>
const props = defineProps({
  nextCursor: {
    type: String,
    required: false,
    default: '',
  },
  links: {
    type: Object as PropType<{ next: string; previous: string }>,
    required: true,
  },
  showLoadMore: {
    type: Boolean,
    required: false,
    default: false,
  },
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const router = useRouter()
const route = useRoute()

const handleScroll = () => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement
  if (scrollTop + clientHeight >= scrollHeight - 5) {
    loadMore()
  }
}

const loadMore = async () => {
  if (props.nextCursor) {
    await router.push({
      path: route.path,
      query: {
        ...route.query,
        cursor: props.nextCursor,
      },
    })
  }
}

watch(
  () => props.nextCursor,
  () => {
    if (import.meta.client) {
      window.addEventListener('scroll', handleScroll)
      return () => {
        window.removeEventListener('scroll', handleScroll)
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="cursor-pagination">
    <UButton
      v-if="nextCursor && showLoadMore"
      size="md"
      :label="$t('common.load.more')"
      :color="'white'"
      :aria-label="$t('common.load.more')"
      :loading="loading"
      @click="loadMore"
    />
  </div>
</template>
