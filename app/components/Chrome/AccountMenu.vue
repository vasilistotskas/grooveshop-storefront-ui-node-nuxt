<script lang="ts" setup>
/**
 * The header's account control: the "Sign in" button, or the signed-in
 * shopper's avatar opening their menu.
 *
 * Entirely `ClientOnly`. Which of the two it is depends on the visitor,
 * and this header is part of the cached anonymous render. The SSR
 * fallback is the sign-in button — what an anonymous visitor, the
 * common case on a cached page, ends up seeing — so nothing shifts for
 * them when the real control hydrates.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { $routeBaseName } = useNuxtApp()
const { user, loggedIn } = useUserSession()
const cartStore = useCartStore()
const { cleanCartState, refreshCart } = cartStore
const { deleteSession } = useAllAuthAuthentication()
const img = useMediaStreamImage()

/** The shopper's name for the avatar's initials, else their email. */
const displayName = computed(() => {
  const name = [user.value?.firstName, user.value?.lastName]
    .filter(Boolean)
    .join(' ')
  return name || user.value?.email || ''
})

const avatarSrc = computed(() => {
  const path = user.value?.mainImagePath
  if (!path) return undefined
  return img(path, { width: 64, height: 64, fit: 'cover' }, { provider: 'mediaStream' })
})

const onClickLogout = async () => {
  const name = $routeBaseName(route)
  if (!name) return
  // Leave a protected page BEFORE the session goes, or the route guard
  // races the logout and bounces through the login page.
  if (isRouteProtected(String(name))) await navigateTo(localePath('/'))

  await cleanCartState()
  try {
    await deleteSession({ explicit: true })
    await refreshCart()
  }
  catch (error) {
    log.error({ action: 'auth:logout', error })
  }
}

const items = computed(() => [
  [
    {
      label: user.value?.email ?? '',
      slot: 'account' as const,
      disabled: true,
    },
  ],
  [
    {
      label: t('account'),
      icon: 'i-heroicons-user',
      onSelect: () => navigateTo(localePath('/account')),
    },
    {
      label: t('orders'),
      icon: 'i-heroicons-shopping-bag',
      onSelect: () => navigateTo(localePath('/account/orders')),
    },
    {
      label: t('favourites'),
      icon: 'i-heroicons-heart',
      onSelect: () => navigateTo(localePath('/account/favourites/products')),
    },
    {
      label: t('settings'),
      icon: 'i-heroicons-cog-8-tooth',
      onSelect: () => navigateTo(localePath('/account/settings')),
    },
  ],
  [
    {
      label: t('logout'),
      icon: 'i-heroicons-arrow-left-on-rectangle',
      onSelect: () => onClickLogout(),
    },
  ],
])
</script>

<template>
  <ClientOnly>
    <UDropdownMenu
      v-if="loggedIn && user"
      :items="items"
      :ui="{ content: 'w-56' }"
    >
      <UButton
        :aria-label="t('account_menu')"
        color="neutral"
        variant="ghost"
        size="sm"
        trailing-icon="i-heroicons-chevron-down"
        class="ps-1 pe-1.5"
      >
        <UAvatar
          :src="avatarSrc"
          :alt="displayName"
          size="md"
          :ui="{
            root: 'bg-(--ui-secondary-soft)',
            fallback: 'text-[0.8125rem] font-extrabold text-accent',
          }"
        />
      </UButton>

      <template #account>
        <div class="min-w-0">
          <p class="text-xs text-muted">
            {{ t('signed_in_as') }}
          </p>
          <p class="truncate text-sm font-medium text-highlighted">
            {{ user.email }}
          </p>
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
  signed_in_as: Συνδεδεμένος ως
  orders: Παραγγελίες
  account_menu: Μενού λογαριασμού
en:
  signed_in_as: Signed in as
  orders: Orders
  account_menu: Account menu
</i18n>
