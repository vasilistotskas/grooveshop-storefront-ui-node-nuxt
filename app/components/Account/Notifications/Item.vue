<script lang="ts" setup>
/**
 * One notification on the account's Notifications page, as the board
 * draws it: an icon tile for what it is about, its title and message
 * (one button that opens it), when it arrived, a dot while it is unread,
 * and a button that flips it between read and unread. An unread row has a
 * stronger ring.
 */
const props = defineProps<{
  row: NotificationUserDetail
}>()

const emit = defineEmits<{
  open: []
  toggle: []
}>()

const { t, locale } = useI18n()

const CATEGORY_ICON: Record<NotificationCategory, string> = {
  ORDER: 'i-lucide-shopping-bag',
  PAYMENT: 'i-lucide-credit-card',
  SHIPPING: 'i-lucide-truck',
  CART: 'i-lucide-shopping-cart',
  PRODUCT: 'i-lucide-package',
  ACCOUNT: 'i-lucide-user',
  SECURITY: 'i-lucide-lock',
  PROMOTION: 'i-lucide-tag',
  SYSTEM: 'i-lucide-settings',
  REVIEW: 'i-lucide-message-square',
  WISHLIST: 'i-lucide-heart',
  SUPPORT: 'i-lucide-life-buoy',
  NEWSLETTER: 'i-lucide-mail',
  RECOMMENDATION: 'i-lucide-sparkles',
}

const icon = computed(() => {
  const category = props.row.notification?.category
  return (category && CATEGORY_ICON[category]) || 'i-lucide-bell'
})

const toggleLabel = computed(() => props.row.seen ? t('mark_unseen') : t('mark_seen'))
</script>

<template>
  <div
    class="flex items-start gap-3 rounded-[1.25rem] bg-default p-4 ring"
    :class="row.seen ? 'ring-default' : 'ring-accented'"
  >
    <span
      class="
        flex size-10 shrink-0 items-center justify-center rounded-xl
        bg-elevated text-highlighted
      "
    >
      <UIcon
        :name="icon"
        class="size-5"
        aria-hidden="true"
      />
    </span>

    <button
      type="button"
      class="grid min-w-0 flex-1 cursor-pointer gap-0.5 text-left"
      @click="() => emit('open')"
    >
      <span class="text-sm font-semibold text-highlighted">
        {{ extractTranslated(row.notification, 'title', locale) }}
      </span>
      <span class="text-sm text-toned">
        {{ extractTranslated(row.notification, 'message', locale) }}
      </span>
      <span
        v-if="row.notification?.link"
        class="mt-1 inline-flex items-center gap-1 text-xs text-toned"
      >
        <UIcon
          name="i-lucide-arrow-up-right"
          class="size-3"
          aria-hidden="true"
        />
        {{ t('open') }}
      </span>
    </button>

    <div class="flex shrink-0 flex-col items-end gap-1">
      <div class="flex items-center gap-2 text-xs text-toned">
        <NuxtTime
          :datetime="row.createdAt"
          :locale="locale"
          relative
          numeric="auto"
        />
        <span
          v-if="!row.seen"
          class="size-2 rounded-full bg-secondary"
        >
          <span class="sr-only">{{ t('unread') }}</span>
        </span>
      </div>
      <UTooltip :text="toggleLabel">
        <UButton
          :icon="row.seen ? 'i-lucide-mail' : 'i-lucide-mail-open'"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="toggleLabel"
          @click="() => emit('toggle')"
        />
      </UTooltip>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  open: Άνοιγμα
  unread: Μη αναγνωσμένη
  mark_seen: Σήμανση ως αναγνωσμένη
  mark_unseen: Σήμανση ως μη αναγνωσμένη
en:
  open: Open
  unread: Unread
  mark_seen: Mark as read
  mark_unseen: Mark as unread
</i18n>
