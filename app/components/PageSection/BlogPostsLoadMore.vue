<script lang="ts" setup>
/**
 * The "load more" of a blog band that goes on with its list
 * (`useBlogPostsLoadMore`): the button and what a shopper who cannot see the
 * page is told.
 *
 * Every drawing of the band mounts it below its posts. The button is a real
 * button that stays enabled while a page is read (a disabled button loses
 * the keyboard's focus): `aria-busy` says it is working and the composable
 * ignores a second press. Each page is announced politely, how many posts
 * it added, and when the last page leaves no button the focus moves to this
 * block rather than to the top of the document. A drawing with a look of
 * its own supplies the button in the `button` slot.
 */
const props = defineProps<{
  hasMore: boolean
  loading: boolean
  /** How many posts the last read added; 0 until one has. */
  added: number
}>()

const emit = defineEmits<{ load: [] }>()

defineSlots<{
  button?: (slotProps: { loading: boolean, label: string, load: () => void }) => unknown
}>()

const { t } = useStoreI18n('components/PageSection/BlogPostsLoadMore')

const root = useTemplateRef<HTMLElement>('root')

const announcement = computed(() => props.added > 0 ? t('loaded', { count: props.added }, props.added) : '')

// The button the shopper pressed is gone with the last page; hand the focus
// to this block, which stays in the page, instead of letting it fall to the
// top of the document. Only when the focus was on it: asked before the DOM
// updates (a `pre` watcher), while the button is still there.
watch(() => props.hasMore, async (now, before) => {
  if (!before || now || !root.value?.contains(document.activeElement)) return
  await nextTick()
  root.value?.focus({ preventScroll: true })
})
</script>

<template>
  <div
    ref="root"
    tabindex="-1"
    class="outline-none"
  >
    <div
      v-if="hasMore"
      class="mt-8 flex justify-center"
    >
      <slot
        name="button"
        :loading="loading"
        :label="t('button')"
        :load="() => emit('load')"
      >
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          size="lg"
          :label="t('button')"
          :icon="loading ? 'i-lucide-refresh-cw' : 'i-lucide-chevron-down'"
          :ui="{ leadingIcon: loading ? 'motion-safe:animate-spin' : '' }"
          :aria-busy="loading"
          @click="() => emit('load')"
        />
      </slot>
    </div>
    <p
      role="status"
      class="sr-only"
    >
      {{ announcement }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  button: Φόρτωση περισσότερων άρθρων
  loaded: 'Προστέθηκε ένα άρθρο | Προστέθηκαν {count} άρθρα'
en:
  button: Load more posts
  loaded: 'One post added | {count} posts added'
</i18n>
