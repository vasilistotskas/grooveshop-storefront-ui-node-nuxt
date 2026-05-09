<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { loggedIn, user } = useUserSession()
const userStore = useUserStore()
const { account } = storeToRefs(userStore)
const cartStore = useCartStore()
const { getCartTotalItems } = storeToRefs(cartStore)
const { cleanCartState, refreshCart } = cartStore
const { menus: accountMenus } = useAccountMenus()
const { deleteSession } = useAllAuthAuthentication()
const { isModalActive: isCookieModalActive } = useCookieControl()
const { $routeBaseName } = useNuxtApp()

const open = ref(false)

watch(() => route.fullPath, () => {
  open.value = false
})

const cartCountDisplay = computed<string | null>(() => {
  const n = Number(getCartTotalItems.value) || 0
  if (n === 0) return null
  return n > 99 ? '99+' : String(n)
})

const greetingName = computed(() => {
  if (!loggedIn.value) return ''
  return account.value?.firstName?.trim()
    || user.value?.email?.split('@')[0]
    || ''
})

const primaryItems = computed(() => [
  {
    label: t('home'),
    icon: 'i-heroicons-home',
    to: localePath('index'),
  },
  {
    label: t('shop'),
    icon: 'i-heroicons-building-storefront',
    to: localePath('products'),
  },
  {
    label: t('blog'),
    icon: 'i-heroicons-newspaper',
    to: localePath('blog'),
  },
  {
    label: t('search.title'),
    icon: 'i-heroicons-magnifying-glass',
    to: localePath('search'),
  },
  {
    label: t('cart.title'),
    icon: 'i-heroicons-shopping-cart',
    to: localePath('cart'),
    slot: 'cart' as const,
  },
])

const accountAccordionItems = computed(() => [
  {
    label: t('account'),
    icon: 'i-heroicons-user',
    slot: 'account-menu' as const,
  },
])

const onClickLogout = async () => {
  open.value = false
  const routeName = $routeBaseName(route)

  if (routeName && isRouteProtected(String(routeName)))
    await navigateTo(localePath('index'))

  await cleanCartState()

  try {
    await deleteSession({ explicit: true })
    await refreshCart()
  }
  catch (error) {
    log.error({ action: 'auth:logout', error })
  }
}

const loginTo = computed(() =>
  route.path === '/account/login'
    ? localePath('account-login')
    : { path: localePath('account-login'), query: { next: route.path } },
)

const signupTo = computed(() =>
  route.path === '/account/signup'
    ? localePath('account-signup')
    : { path: localePath('account-signup'), query: { next: route.path } },
)

const onClickCookieSettings = () => {
  open.value = false
  isCookieModalActive.value = true
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="left"
    :title="t('menu')"
    :ui="{
      content: 'w-[88vw] max-w-sm',
      header: `
        border-b border-primary-200
        dark:border-primary-800
      `,
      title: 'flex items-center',
      body: 'p-0',
      footer: `
        border-t border-primary-200 p-4
        dark:border-primary-800
      `,
    }"
  >
    <template #title>
      <NuxtLink
        :to="localePath('index')"
        :aria-label="t('menu')"
        class="flex items-center"
      >
        <NuxtImg
          :src="'/img/logo-navbar.svg'"
          :style="{ objectFit: 'contain' }"
          :width="125"
          :height="26"
          alt=""
          quality="80"
        />
        <span class="sr-only">{{ t('menu') }}</span>
      </NuxtLink>
    </template>
    <UButton
      :aria-label="t('menu')"
      :title="t('menu')"
      icon="i-heroicons-bars-3"
      color="neutral"
      variant="ghost"
      size="xl"
      class="
        p-0
        lg:hidden
      "
      :ui="{
        base: `
          cursor-pointer
          hover:bg-transparent
        `,
        leadingIcon: 'size-7',
      }"
    />

    <template #body>
      <div class="flex h-full flex-col">
        <ClientOnly>
          <NuxtLink
            v-if="loggedIn && account"
            :to="localePath('account')"
            class="
              flex items-center gap-3 border-b border-primary-200 bg-primary-50
              px-4 py-4 transition-colors
              dark:border-primary-800 dark:bg-primary-950/40
              hover:bg-primary-100
              dark:hover:bg-primary-900/60
            "
          >
            <UserAvatar
              :user-account="account"
              :show-name="false"
              size="lg"
            />
            <div class="flex min-w-0 flex-col">
              <span
                class="
                  truncate text-sm font-semibold text-primary-950
                  dark:text-primary-50
                "
              >
                {{ t('hello_user', { name: greetingName }) }}
              </span>
              <span
                class="
                  truncate text-xs text-primary-700
                  dark:text-primary-300
                "
              >
                {{ user?.email }}
              </span>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="
                ms-auto size-5 text-primary-400
                dark:text-primary-500
              "
            />
          </NuxtLink>

          <template #fallback>
            <span class="sr-only">{{ t('loading') }}</span>
          </template>
        </ClientOnly>

        <UNavigationMenu
          orientation="vertical"
          :items="primaryItems"
          :aria-label="t('navigation')"
          :ui="{
            link: `
              gap-3 border-0 px-4 py-3
              before:rounded-none
            `,
            linkLeadingIcon: 'size-5',
            linkLabel: 'text-base font-semibold capitalize',
            linkTrailing: 'ms-auto',
          }"
        >
          <template #cart-trailing>
            <ClientOnly>
              <UBadge
                v-if="cartCountDisplay"
                :label="cartCountDisplay"
                color="success"
                variant="solid"
                size="sm"
              />
            </ClientOnly>
          </template>
        </UNavigationMenu>

        <UAccordion
          v-if="loggedIn"
          :items="accountAccordionItems"
          type="single"
          collapsible
          :ui="{
            root: `
              border-t border-primary-200
              dark:border-primary-800
            `,
            item: 'border-0',
            trigger: 'gap-3 px-4 py-3',
            leadingIcon: 'size-5',
            label: 'text-base font-semibold capitalize',
            content: 'pb-0',
            body: 'pb-0',
          }"
        >
          <template #account-menu>
            <UNavigationMenu
              orientation="vertical"
              :items="accountMenus"
              :aria-label="t('account')"
              :ui="{
                link: `
                  gap-3 px-6 py-2 text-sm
                  data-[active=true]:text-(--ui-secondary)
                `,
                linkLeadingIcon: 'size-4',
                linkLabel: 'text-sm capitalize',
              }"
            />
          </template>
        </UAccordion>

        <div
          class="
            mt-auto flex items-center justify-center border-t
            border-primary-200 px-4 py-3
            dark:border-primary-800
          "
        >
          <UButton
            :label="t('cookie_settings')"
            icon="i-unjs:cookie-es"
            color="neutral"
            variant="link"
            size="sm"
            class="cursor-pointer"
            @click="onClickCookieSettings"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <ClientOnly>
        <UButton
          v-if="loggedIn"
          :label="t('logout')"
          icon="i-heroicons-arrow-left-on-rectangle"
          color="neutral"
          variant="soft"
          size="md"
          block
          class="cursor-pointer"
          @click="onClickLogout"
        />
        <div v-else class="flex flex-col gap-3 w-full">
          <div class="grid grid-cols-2 gap-2 w-full">
            <UButton
              :label="t('register')"
              icon="i-heroicons-user-plus"
              color="primary"
              variant="outline"
              size="md"
              block
              class="cursor-pointer"
              :to="signupTo"
            />
            <UButton
              :label="t('login')"
              icon="i-heroicons-arrow-right-on-rectangle"
              color="primary"
              variant="solid"
              size="md"
              block
              class="cursor-pointer"
              :to="loginTo"
            />
          </div>
        </div>

        <template #fallback>
          <div class="grid grid-cols-2 gap-2">
            <UButton
              :label="t('register')"
              icon="i-heroicons-user-plus"
              color="primary"
              variant="outline"
              size="md"
              block
              disabled
            />
            <UButton
              :label="t('login')"
              icon="i-heroicons-arrow-right-on-rectangle"
              color="primary"
              variant="solid"
              size="md"
              block
              disabled
            />
          </div>
        </template>
      </ClientOnly>
    </template>
  </USlideover>
</template>

<i18n lang="yaml">
el:
  menu: Μενού
  navigation: Πλοήγηση
  loading: Φόρτωση
  hello_user: Γεια σου, {name}
  cookie_settings: Ρυθμίσεις cookies
</i18n>
