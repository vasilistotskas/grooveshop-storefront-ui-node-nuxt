<script lang="ts" setup>
import { clearCursorStates, getCursorFromUrl } from '~/utils/pagination'
import {
  type PaginationCursorStateEnum,
  type CursorStates,
} from '~/types/global/general'
import type { PropType } from 'vue'

const props = defineProps({
  stateName: {
    type: String as PropType<PaginationCursorStateEnum>,
    required: true,
  },
  links: {
    type: Object as PropType<{ next: string; previous: string }>,
    required: true,
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
  strategy: {
    type: String as PropType<'button' | 'scroll'>,
    required: false,
    validator: (value: string) => ['button', 'scroll'].includes(value),
    default: 'button',
  },
})

const router = useRouter()
const route = useRoute()

const cursorState = useState<CursorStates>('cursorStates', () =>
  generateInitialCursorStates(),
)

const currentState = computed(() => {
  return { ...cursorState.value }
})
const currentCursor = computed(() => {
  return currentState.value[props.stateName]
})

const nextCursor = computed(() => {
  if (!props.links?.next) return ''
  return getCursorFromUrl(props.links.next)
})

const handleScroll = () => {
  if (props.strategy !== 'scroll') return

  const { scrollTop, scrollHeight, clientHeight } = document.documentElement
  if (scrollTop + clientHeight >= scrollHeight - 5) {
    loadMore()
  }
}

const loadMore = async () => {
  if (!nextCursor.value || props.loading) return

  if (nextCursor.value !== currentCursor.value) {
    currentState.value[props.stateName] = nextCursor.value
    cursorState.value = currentState.value

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

const showButton = computed(() => {
  if (props.strategy === 'scroll') return false
  if (props.loading) return true
  if (nextCursor.value !== currentCursor.value) return true
  return false
})

watch(
  () => props.strategy,
  (newStrategy) => {
    if (import.meta.client) {
      if (newStrategy === 'scroll') {
        window.addEventListener('scroll', handleScroll)
      } else {
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
      v-if="nextCursor && showButton && strategy === 'button'"
      size="md"
      :label="$t('common.load.more')"
      :color="'white'"
      :aria-label="$t('common.load.more')"
      :loading="loading"
      @click="loadMore"
    />
  </div>
</template>
