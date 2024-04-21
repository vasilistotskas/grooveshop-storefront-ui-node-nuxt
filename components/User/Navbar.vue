<script lang="ts" setup>
import type { FunctionalComponent, SVGAttributes } from 'vue'

interface IMenuItem {
  type: 'link' | 'button' | 'external-link'
  text: string
  href?: string
  route?: string | { name: string, path: string }
  icon?: FunctionalComponent<SVGAttributes> | string
  cssClass?: string
}

defineSlots<{
  image(props: object): any
  drawer(props: object): any
}>()

const { session, loggedIn, clear } = useUserSession()

const { t } = useI18n()
const { logout } = useAuth()

const userStore = useUserStore()
const { cleanAccountState } = userStore
const cartStore = useCartStore()
const { getCartTotalItems } = storeToRefs(cartStore)
const { cleanCartState, refreshCart } = cartStore

const authLogoutEvent = async () => {
  await navigateTo('/')
  await logout({
    refresh: session.value?.refreshToken,
  })
  cleanCartState()
  cleanAccountState()
  await clear()
  await refreshCart()
}

const menus = computed((): IMenuItem[] => [
  {
    type: 'link',
    text: t('pages.accounts.security.title'),
    route: { name: 'auth-security', path: '/auth/security' },
    icon: 'i-heroicons-shield-check',
    cssClass: '',
  },
])
</script>

<template>
  <BuilderNavbar
    class="
      bg-primary-100

      dark:bg-primary-900
    "
  >
    <template #menu>
      <nav
        class="
          text-primary-950 flex items-center text-lg font-semibold leading-6

          dark:text-primary-50
        "
      >
        <ul
          class="
            flex items-center gap-2

            md:gap-4
          "
        >
          <li
            v-for="(item, i) in menus"
            :key="i"
            class="
              relative grid items-center justify-center justify-items-center
            "
          >
            <UButton
              v-if="item.type === 'link' && typeof item.route !== 'string'"
              size="md"
              :class="item.cssClass"
              :to="item.route ? item.route.path : undefined"
              :icon="item.icon as string"
              color="secondary"
            />
            <Anchor
              v-if="item.type === 'external-link'"
              :href="item.href"
              class="
                transition-color flex items-center rounded border px-2 py-1
                duration-300

                focus:secondary/[0.6] focus:dark:secondary focus:outline-none
                focus:ring-1 focus:ring-offset-1
                focus:ring-offset-gray-800/[0.6] focus:dark:ring-offset-gray-50

                md:grid md:px-4 md:py-2
              "
              :class="[
                {
                  'grid-cols-auto-1fr gap-2': item.icon !== undefined,
                },
                item.cssClass,
              ]"
            >
              <span
                class="
                  sr-only

                  md:grid
                "
              >{{ item.text }}</span>
              <Component :is="item.icon" />
            </Anchor>
            <UButton
              v-else-if="item.type === 'button'"
              size="md"
              class="font-extrabold capitalize"
              :label="item.text"
              :to="item.route ? item.route : undefined"
              color="primary"
            />
          </li>
          <li
            class="
              relative grid items-center justify-center justify-items-center
            "
          >
            <UButton
              size="md"
              :trailing="false"
              icon="i-heroicons-arrow-left-start-on-rectangle"
              class="
                text-primary-100

                dark:text-primary-50
              "
              color="red"
              @click="authLogoutEvent"
            />
          </li>
        </ul>
      </nav>
      <div
        class="
          sr-only relative ml-auto items-center

          lg:flex
        "
      >
        <div class="flex items-center justify-center">
          <slot name="image" />
        </div>
        <ul
          class="
            text-primary-950 ml-6 flex items-center gap-3 border-l
            border-gray-900/10 pl-6

            dark:text-primary-50 dark:border-gray-50/[0.2]
          "
        >
          <li
            class="
              relative grid items-center justify-center justify-items-center
            "
          >
            <LanguageSwitcher />
          </li>
          <li
            class="
              relative grid items-center justify-center justify-items-center
            "
          >
            <ThemeSwitcher />
          </li>
          <li
            class="
              relative grid items-center justify-center justify-items-center
            "
          >
            <span class="cart-items-count" :data-count="getCartTotalItems" />
            <Anchor
              class="
                flex items-center self-center text-[1.5rem]

                hover:text-slate-900 hover:no-underline
                hover:dark:text-primary-50
              "
              :to="'cart'"
              :title="$t('pages.cart.title')"
              :text="$t('pages.cart.title')"
            >
              <span class="sr-only">{{ $t('pages.cart.title') }}</span>
              <IconFa6Solid:cartShopping />
            </Anchor>
          </li>
          <li
            class="
              relative grid items-center justify-center justify-items-center
            "
          >
            <UButton
              icon="i-heroicons-user"
              :to="
                loggedIn ? '/account' : `/auth/login?redirect=${$route.path}`
              "
              size="md"
              variant="solid"
              color="primary"
              :label="loggedIn ? $t('common.account') : $t('common.login')"
            />
          </li>
        </ul>
      </div>
    </template>
    <template #options="{ toggleOptions }">
      <ActionSheet @on-close="toggleOptions(false)">
        <ActionSheetBody class="grid gap-4">
          <ActionSheetHeader text="Menu" />
          <nav
            class="
              text-primary-950 font-semibold leading-6

              dark:text-primary-50
            "
          >
            <ul
              class="
                flex flex-row items-center justify-center gap-2 border-b
                border-gray-900/10

                dark:border-gray-50/[0.2]
              "
            >
              <li class="link grid gap-2 pb-2">
                <UButton
                  icon="i-heroicons-shopping-bag"
                  :to="'/products'"
                  size="md"
                  variant="solid"
                  color="primary"
                  :label="$t('common.shop')"
                />
                <UButton
                  icon="i-heroicons-magnifying-glass"
                  :to="'/search'"
                  size="md"
                  variant="solid"
                  color="primary"
                  :label="$t('common.search')"
                />
              </li>
              <li class="link grid gap-2 pb-2">
                <UButton
                  icon="i-heroicons-user"
                  :to="
                    loggedIn
                      ? '/account'
                      : `/auth/login?redirect=${$route.path}`
                  "
                  size="md"
                  variant="solid"
                  color="primary"
                  :label="loggedIn ? $t('common.account') : $t('common.login')"
                />
                <UButton
                  v-if="loggedIn"
                  icon="i-heroicons-shield-check"
                  to="/auth/security"
                  size="md"
                  variant="solid"
                  color="primary"
                  :label="$t('pages.accounts.security.title')"
                />
              </li>
            </ul>
          </nav>
          <div class="flex items-center justify-center gap-3">
            <div class="grid items-center justify-center justify-items-center">
              <ThemeSwitcher type="select-box" />
            </div>
            <div class="grid items-center justify-center justify-items-center">
              <LanguageSwitcher type="select-box" />
            </div>
          </div>
          <Anchor
            class="
              text-primary-950 flex items-center justify-center gap-2
              self-center text-lg

              dark:text-primary-50

              hover:text-slate-900 hover:no-underline hover:dark:text-primary-50
            "
            :to="'cart'"
            :title="$t('pages.cart.title')"
            :text="$t('pages.cart.title')"
          >
            <IconFa6Solid:cartShopping />
            <span
              class="
                text-primary-950 ml-1

                dark:text-primary-50
              "
            >
              {{ $t('pages.cart.title') }}</span>
          </Anchor>
          <UButton
            size="md"
            :trailing="false"
            class="
              text-primary-100

              dark:text-primary-50
            "
            icon="i-heroicons-arrow-left-start-on-rectangle"
            color="red"
            @click="authLogoutEvent"
          />
        </ActionSheetBody>
        <UButton
          size="md"
          :label="$t('common.close')"
          color="primary"
          @click.prevent="toggleOptions(false)"
        />
      </ActionSheet>
    </template>
    <template #drawer>
      <slot name="drawer" />
    </template>
  </BuilderNavbar>
</template>

<style lang="scss" scoped>
.cart-items-count {
  &::before {
    content: attr(data-count);
    display: grid;
    position: absolute;
    top: -5px;
    align-items: center;
    justify-content: center;
    width: 70%;
    height: 70%;
    border-radius: 50%;
    background: #eb2e2b;
    cursor: pointer;
    color: #fff;
    font-size: 10px;
    pointer-events: none;
    right: -5px;
    z-index: 10;
    line-height: 16px;
  }
}
</style>
