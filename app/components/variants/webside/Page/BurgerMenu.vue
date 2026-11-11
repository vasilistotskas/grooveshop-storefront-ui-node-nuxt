<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

/**
 * Webside's phone menu, in sections: the shopper's account, the shop
 * (all products, then each category with its picture and count), the
 * blog (all articles, then its topics), the store's own links, and the
 * appearance (light, dark or the device's). A section for a feature the
 * store has switched off is not drawn. Every control is at least 44px
 * tall.
 *
 * Its content is mounted, hidden, once the page is idle, so a tap only
 * shows it; any navigation closes it.
 */
const { t } = useStoreI18n('components/variants/webside/Page/BurgerMenu')
const localePath = useLocalePath()
const route = useRoute()
const { loggedIn, user } = useUserSession()
const userStore = useUserStore()
const { account } = storeToRefs(userStore)
const cartStore = useCartStore()
const { cleanCartState, refreshCart } = cartStore
const { menus: accountMenus } = useAccountMenus()
const { deleteSession } = useAllAuthAuthentication()
const { isModalActive: isCookieModalActive } = useCookieControl()
const { $routeBaseName } = useNuxtApp()
const tenantStore = useTenantStore()

// Gift-card purchase page discoverability, matching the desktop navbar.
const giftCardsServing = useGatedRoute('/gift-cards')
const catalogueEnabled = useStoreFeature('catalogue')
const blogEnabled = useStoreFeature('blog')
const { categories } = useCategoryMenu()
const { blogCategories } = useBlogCategoryMenu()
const { mobileLinks } = useNavigation()

const open = ref(false)

// Mounted ahead of the first tap, so opening it only shows it (INP).
const premount = useOverlayPremount()

watch(() => route.fullPath, () => {
  open.value = false
})

const greetingName = computed(() => {
  if (!loggedIn.value) return ''
  return account.value?.firstName?.trim()
    || user.value?.email?.split('@')[0]
    || ''
})

/** The sections that cover a link's target, so the store's links do not repeat them. */
const sectionShown = computed<Record<MenuDropdown, boolean>>(() => ({
  shop: catalogueEnabled.value,
  blog: blogEnabled.value,
}))

/** Whether a link to `path` is already a section of the menu. */
const coveredBySection = (path: string | undefined) => {
  const dropdown = menuDropdownFor(path)
  return dropdown !== undefined && sectionShown.value[dropdown]
}

/**
 * The store's own links: its Mobile menu (else its Header menu), or the
 * built-in ones for a store that configured neither. Either way without
 * the links the shop and blog sections already stand for.
 */
const storeLinks = computed<NavigationMenuItem[]>(() => {
  const configured = mobileLinks.value
  if (configured) {
    return configured
      .filter(item => !coveredBySection(item.to))
      .map(item => ({
        label: item.label,
        icon: item.icon ?? 'i-heroicons-link',
        to: item.to ? localePath(pathLocation(item.to)) : undefined,
        href: item.to ? undefined : item.href,
        target: item.href ? '_blank' : undefined,
      }))
  }
  const base: NavigationMenuItem[] = [
    {
      label: t('home'),
      icon: 'i-heroicons-home',
      to: localePath('index'),
    },
  ]
  if (giftCardsServing.value) {
    base.push({
      label: t('gift_cards'),
      icon: 'i-heroicons-gift',
      to: localePath('gift-cards'),
    })
  }
  base.push({
    label: t('search.title'),
    icon: 'i-heroicons-magnifying-glass',
    to: localePath('search'),
  })
  return base
})

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
    :unmount-on-hide="!premount"
    side="left"
    :title="t('menu')"
    :close="{ size: 'xl', class: 'size-11 justify-center' }"
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
        class="flex min-h-11 items-center"
      >
        <TenantLogo
          :width="125"
          :height="36"
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
        size-11 justify-center p-0
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
      <div class="flex min-h-full flex-col gap-6 p-4">
        <ClientOnly>
          <div
            v-if="loggedIn"
            class="flex flex-col"
          >
            <NuxtLink
              v-if="account"
              :to="localePath('account')"
              class="
                flex min-h-11 items-center gap-3 rounded-lg border
                border-primary-200 bg-primary-50 p-3 transition-colors
                hover:bg-primary-100
                motion-reduce:transition-none
                dark:border-primary-800 dark:bg-primary-950/40
                dark:hover:bg-primary-900/60
              "
            >
              <div
                data-clarity-mask="true"
                class="contents"
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
              </div>
              <UIcon
                name="i-heroicons-chevron-right"
                class="
                  ms-auto size-5 text-primary-400
                  dark:text-primary-500
                "
              />
            </NuxtLink>

            <UAccordion
              :items="accountAccordionItems"
              type="single"
              collapsible
              :ui="{
                item: 'border-0',
                trigger: 'min-h-11 gap-3 px-1 py-3',
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
                      min-h-11 gap-3 px-3 py-2 text-sm
                      data-active:text-(--ui-secondary)
                    `,
                    linkLeadingIcon: 'size-4',
                    linkLabel: 'text-sm capitalize',
                  }"
                />
              </template>
            </UAccordion>
          </div>

          <div
            v-else
            class="
              flex flex-col gap-2.5 rounded-lg border border-primary-200
              bg-primary-50 p-3.5
              dark:border-primary-800 dark:bg-primary-950/40
            "
          >
            <p
              class="
                text-[0.9375rem] text-primary-700
                dark:text-primary-200
              "
            >
              <strong
                class="
                  text-primary-950
                  dark:text-primary-50
                "
              >{{ t('greeting') }}</strong>
              {{ t('sign_in_prompt') }}
            </p>
            <div class="grid grid-cols-2 gap-2">
              <UButton
                :label="t('login')"
                color="secondary"
                variant="solid"
                size="lg"
                block
                class="min-h-11 cursor-pointer"
                :to="loginTo"
              />
              <UButton
                :label="t('register')"
                color="neutral"
                variant="outline"
                size="lg"
                block
                class="min-h-11 cursor-pointer"
                :to="signupTo"
              />
            </div>
          </div>

          <template #fallback>
            <span class="sr-only">{{ t('loading') }}</span>
          </template>
        </ClientOnly>

        <nav
          v-if="catalogueEnabled"
          :aria-label="t('shop')"
        >
          <p class="mb-1 text-xs font-bold tracking-wider text-muted uppercase">
            {{ t('shop') }}
          </p>
          <ul class="divide-y divide-default">
            <li>
              <ULink
                :to="localePath('products')"
                class="
                  flex min-h-12 items-center gap-3 px-1 text-base font-semibold
                  text-highlighted
                "
              >
                {{ t('all_products') }}
              </ULink>
            </li>
            <li
              v-for="category in categories"
              :key="category.id"
            >
              <ULink
                :to="localePath(pathLocation(category.to))"
                class="
                  flex min-h-15 items-center gap-3 px-1 text-base font-semibold
                  text-highlighted
                "
              >
                <ImgWithFallback
                  v-if="category.imagePath"
                  :src="category.imagePath"
                  alt=""
                  :width="44"
                  :height="44"
                  fit="cover"
                  loading="lazy"
                  densities="x1 x2"
                  class="size-11 shrink-0 rounded-lg bg-elevated object-cover"
                />
                <span class="min-w-0 flex-1 truncate">{{ category.label }}</span>
                <span class="text-sm font-medium text-muted">
                  {{ category.productCount }}
                  <span class="sr-only">{{ t('products', category.productCount) }}</span>
                </span>
              </ULink>
            </li>
          </ul>
        </nav>

        <nav
          v-if="blogEnabled"
          :aria-label="t('blog')"
        >
          <p class="mb-2 text-xs font-bold tracking-wider text-muted uppercase">
            {{ t('blog') }}
          </p>
          <ul class="flex flex-wrap gap-2">
            <li>
              <UButton
                :to="localePath('blog')"
                :label="t('all_articles')"
                color="neutral"
                variant="solid"
                size="lg"
                class="min-h-11 rounded-full px-4"
              />
            </li>
            <li
              v-for="topic in blogCategories"
              :key="topic.id"
            >
              <UButton
                :to="localePath(pathLocation(topic.to))"
                :label="topic.label"
                color="neutral"
                variant="outline"
                size="lg"
                class="min-h-11 rounded-full px-4"
              />
            </li>
          </ul>
        </nav>

        <div v-if="storeLinks.length">
          <p
            v-if="tenantStore.storeName"
            class="mb-1 text-xs font-bold tracking-wider text-muted uppercase"
          >
            {{ tenantStore.storeName }}
          </p>
          <UNavigationMenu
            orientation="vertical"
            :items="storeLinks"
            :aria-label="t('navigation')"
            :ui="{
              link: `
                min-h-11 gap-3 border-0 px-1 py-3
                before:rounded-none
              `,
              linkLeadingIcon: 'size-5',
              linkLabel: 'text-base font-semibold capitalize',
              linkTrailing: 'ms-auto',
            }"
          />
        </div>

        <div>
          <p class="mb-2 text-xs font-bold tracking-wider text-muted uppercase">
            {{ t('appearance') }}
          </p>
          <UColorModeSelect
            color="neutral"
            size="xl"
            :aria-label="t('appearance')"
            class="min-h-11 w-full"
          />
        </div>

        <div class="mt-auto flex items-center justify-center">
          <UButton
            :label="t('cookie_settings')"
            icon="i-unjs:cookie-es"
            color="neutral"
            variant="link"
            size="sm"
            class="min-h-11 cursor-pointer"
            @click="onClickCookieSettings"
          />
        </div>
      </div>
    </template>

    <template
      v-if="loggedIn"
      #footer
    >
      <UButton
        :label="t('logout')"
        icon="i-heroicons-arrow-left-on-rectangle"
        color="neutral"
        variant="soft"
        size="lg"
        block
        class="min-h-11 cursor-pointer"
        @click="onClickLogout"
      />
    </template>
  </USlideover>
</template>

<i18n lang="yaml">
el:
  menu: Μενού
  navigation: Πλοήγηση
  loading: Φόρτωση
  hello_user: Γεια σου, {name}
  greeting: Γεια σου!
  sign_in_prompt: Συνδέσου για παραγγελίες και αγαπημένα.
  all_products: Όλα τα προϊόντα
  all_articles: Όλα τα άρθρα
  products: "προϊόν | προϊόντα"
  appearance: Εμφάνιση
  cookie_settings: Ρυθμίσεις cookies
en:
  menu: Menu
  navigation: Navigation
  loading: Loading
  hello_user: Hello, {name}
  greeting: Hello!
  sign_in_prompt: Sign in for your orders and favourites.
  all_products: All products
  all_articles: All articles
  products: "product | products"
  appearance: Appearance
  cookie_settings: Cookie settings
</i18n>
