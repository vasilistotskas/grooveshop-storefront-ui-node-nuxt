<script lang="ts" setup>
/**
 * The header's account control: the "Sign in" button, or the signed-in
 * shopper's avatar opening their menu — their name and email, their
 * standing (tier and points, business account) and the pages worth one
 * tap: the account, orders, favourites, rewards and security.
 *
 * Entirely `ClientOnly`. Which of the two it is depends on the visitor,
 * and this header is part of the cached anonymous render. The SSR
 * fallback is the sign-in button — what an anonymous visitor, the
 * common case on a cached page, ends up seeing — so nothing shifts for
 * them when the real control hydrates.
 */
const { t, n } = useI18n()
const localePath = useLocalePath()
const { loggedIn, user } = useUserSession()
const { signOut } = useSignOut()
const menu = useAccountQuickMenu(['overview', 'orders', 'favourites', 'rewards', 'security'])

const items = computed(() => [
  [
    {
      label: menu.name.value,
      slot: 'account' as const,
      // A label, not a disabled row: the shopper's card is not an action.
      type: 'label' as const,
    },
  ],
  menu.pages.value.map(page => ({
    label: page.key === 'overview' ? t('account') : page.label,
    icon: page.icon,
    to: page.to,
  })),
  [
    {
      label: t('sign_out'),
      icon: 'i-lucide-log-out',
      onSelect: () => signOut(),
    },
  ],
])

const AVATAR_UI = { root: 'bg-volt', fallback: 'text-[0.8125rem] font-extrabold text-on-volt' }
const MENU_AVATAR_UI = { root: 'bg-volt', fallback: 'font-extrabold text-on-volt' }
const MENU_UI = { content: 'w-72' }
</script>

<template>
  <ClientOnly>
    <UDropdownMenu
      v-if="loggedIn && user"
      :items="items"
      :ui="MENU_UI"
      @update:open="(open: boolean) => { if (open) menu.load() }"
    >
      <UButton
        :aria-label="t('account_menu')"
        color="neutral"
        variant="ghost"
        size="sm"
        trailing-icon="i-lucide-chevron-down"
        class="ps-1 pe-1.5"
      >
        <UAvatar
          :src="menu.avatarSrc.value"
          :alt="menu.name.value"
          size="md"
          :ui="AVATAR_UI"
        />
      </UButton>

      <template #account>
        <div class="flex min-w-0 flex-col gap-2.5 py-1">
          <div class="flex min-w-0 items-center gap-3">
            <UAvatar
              :src="menu.avatarSrc.value"
              :alt="menu.name.value"
              size="lg"
              :ui="MENU_AVATAR_UI"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-highlighted">
                {{ menu.name.value }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ menu.email.value }}
              </p>
            </div>
          </div>
          <div
            v-if="menu.pointsBalance.value !== null || menu.isBusiness.value"
            class="flex flex-wrap items-center gap-1.5"
          >
            <UBadge
              v-if="menu.pointsBalance.value !== null"
              color="neutral"
              class="bg-volt text-on-volt ring-0"
            >
              <template v-if="menu.tierName.value">
                {{ menu.tierName.value }} ·
              </template>
              {{ t('points', { count: n(menu.pointsBalance.value) }, menu.pointsBalance.value) }}
            </UBadge>
            <UBadge
              v-if="menu.isBusiness.value"
              :label="t('business')"
              color="neutral"
              class="bg-inverted text-inverted ring-0"
            />
          </div>
        </div>
      </template>
    </UDropdownMenu>

    <UButton
      v-else
      :to="localePath('/account/login')"
      :label="t('login')"
      size="sm"
    />

    <template #fallback>
      <UButton
        :to="localePath('/account/login')"
        :label="t('login')"
        size="sm"
      />
    </template>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  account: Λογαριασμός
  account_menu: Μενού λογαριασμού
  sign_out: Αποσύνδεση
  business: B2B
  points: '{count} πόντος | {count} πόντοι'
en:
  account: Account
  account_menu: Account menu
  sign_out: Sign out
  business: B2B
  points: '{count} pt | {count} pts'
</i18n>
