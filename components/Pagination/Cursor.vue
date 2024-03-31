<script lang="ts" setup>
import { clearCursorStates, getCursorFromUrl } from '~/utils/pagination'
import type { PaginationCursorStateEnum } from '~/types/global/general'
import { type CursorStates } from '~/types/global/general'

const props = defineProps({
  stateName: {
    type: String as PropType<PaginationCursorStateEnum>,
    required: true,
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
  useRouteQuery: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const router = useRouter()
const route = useRoute()

const cursorState = useState<CursorStates>('cursorStates', () =>
  generateInitialCursorStates(),
)

const nextCursor = computed(() => {
  if (!props.links?.next) return ''
  return getCursorFromUrl(props.links.next)
})

const handleScroll = () => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement
  if (scrollTop + clientHeight >= scrollHeight - 5) {
    loadMore()
  }
}

const loadMore = async () => {
  if (!nextCursor.value) return

  const currentState = { ...cursorState.value }
  const currentCursor = currentState[props.stateName]

  if (nextCursor.value !== currentCursor) {
    currentState[props.stateName] = nextCursor.value
    cursorState.value = currentState

    if (props.useRouteQuery) {
      await router.push({
        path: route.path,
        query: {
          ...route.query,
          cursor: nextCursor.value,
        },
      })
    }
  }
}

watch(
  () => nextCursor.value,
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
  clearCursorStates(cursorState.value)
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
