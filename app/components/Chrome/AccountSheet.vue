<script lang="ts" setup>
/**
 * The phone's account sheet, opened from the tab bar's Account tab: who
 * the shopper is, their standing (tier and points, business account) and
 * the pages worth one tap — the account, orders, notifications (with
 * their unread count), favourites, rewards and security — and signing out.
 */
const open = defineModel<boolean>('open', { default: false })

const { t, n } = useI18n()
const { signOut } = useSignOut()
const menu = useAccountQuickMenu(['overview', 'orders', 'notifications', 'favourites', 'rewards', 'security'])

watch(open, (isOpen) => {
  if (isOpen) menu.load()
}, { immediate: true })

// The sheet's description is always something: a dialog without one is
// an accessibility error, and an account may have neither standing nor email.
const standing = computed(() => [
  menu.pointsBalance.value !== null
    ? [menu.tierName.value, t('points', { count: n(menu.pointsBalance.value) }, menu.pointsBalance.value)].filter(Boolean).join(' · ')
    : '',
  menu.isBusiness.value ? t('business') : '',
].filter(Boolean).join(' · ') || menu.email.value || t('menu'))

// Any navigation closes the sheet, whichever row started it.
const route = useRoute()
watch(() => route.fullPath, () => {
  open.value = false
})

const AVATAR_UI = { root: 'bg-volt', fallback: 'font-extrabold text-on-volt' }

const UI = {
  content: 'rounded-t-[1.5rem]',
  header: 'flex flex-col gap-1 px-5 pt-4 pb-3',
  body: 'px-3 pb-6',
}
</script>

<template>
  <UDrawer
    v-model:open="open"
    :title="menu.name.value"
    :description="standing"
    :ui="UI"
  >
    <template #title>
      <span class="flex items-center gap-3.5">
        <UAvatar
          :src="menu.avatarSrc.value"
          alt=""
          size="xl"
          :ui="AVATAR_UI"
        />
        <span class="truncate">{{ menu.name.value }}</span>
      </span>
    </template>

    <template #body>
      <ul class="flex flex-col">
        <li
          v-for="page in menu.pages.value"
          :key="page.key"
        >
          <NuxtLink
            :to="page.to"
            class="
              flex h-12 items-center gap-3.5 rounded-xl px-3 text-base
              font-medium text-highlighted transition-colors
              hover:bg-elevated
            "
          >
            <UIcon
              :name="page.icon"
              class="size-5 text-toned"
              aria-hidden="true"
            />
            <span class="flex-1">{{ page.key === 'overview' ? t('account') : page.label }}</span>
            <span
              v-if="page.badge"
              class="
                rounded-full bg-(--ui-secondary-soft) px-2 py-0.5 font-mono
                text-xs font-semibold text-accent
              "
            >
              {{ page.badge }}
              <span class="sr-only">{{ t('unread') }}</span>
            </span>
          </NuxtLink>
        </li>
        <li>
          <button
            type="button"
            class="
              flex h-12 w-full cursor-pointer items-center gap-3.5 rounded-xl
              px-3 text-left text-base font-medium text-highlighted
              transition-colors
              hover:bg-elevated
            "
            @click="() => { signOut() }"
          >
            <UIcon
              name="i-lucide-log-out"
              class="size-5 text-toned"
              aria-hidden="true"
            />
            {{ t('sign_out') }}
          </button>
        </li>
      </ul>
    </template>
  </UDrawer>
</template>

<i18n lang="yaml">
el:
  account: Λογαριασμός
  menu: Μενού λογαριασμού
  sign_out: Αποσύνδεση
  business: B2B
  unread: μη αναγνωσμένες
  points: '{count} πόντος | {count} πόντοι'
en:
  account: Account
  menu: Account menu
  sign_out: Sign out
  business: B2B
  unread: unread
  points: '{count} pt | {count} pts'
</i18n>
