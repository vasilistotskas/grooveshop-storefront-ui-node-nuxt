<script lang="ts" setup>
/**
 * The header's account control: a link to sign in, or the signed-in
 * shopper's menu.
 *
 * Entirely `ClientOnly`. Which of the two it is depends on the visitor,
 * and this header is part of the cached anonymous render — the SSR
 * fallback is a dimensionally identical placeholder so nothing shifts
 * when the real control hydrates.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { $routeBaseName } = useNuxtApp()
const { user, loggedIn } = useUserSession()
const cartStore = useCartStore()
const { cleanCartState, refreshCart } = cartStore
const { deleteSession } = useAllAuthAuthentication()

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
        :aria-label="t('account')"
        color="neutral"
        variant="ghost"
        size="lg"
        square
      >
        <UserAvatar
          :img-height="28"
          :img-width="28"
          :show-name="false"
          :user-account="user"
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
      :aria-label="t('login')"
      icon="i-heroicons-user"
      color="neutral"
      variant="ghost"
      size="lg"
      square
    />

    <!-- SSR placeholder: the same square button, so the header does not
         reflow when the session resolves. -->
    <template #fallback>
      <UButton
        :aria-label="t('account')"
        icon="i-heroicons-user"
        color="neutral"
        variant="ghost"
        size="lg"
        square
        disabled
      />
    </template>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  signed_in_as: Συνδεδεμένος ως
  orders: Παραγγελίες
en:
  signed_in_as: Signed in as
  orders: Orders
</i18n>
