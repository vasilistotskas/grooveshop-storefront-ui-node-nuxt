<script lang="ts" setup>
import type { HorizontalNavigationLink } from '#ui/types'

defineSlots<{
  default(props: object): any
  header(props: object): any
  footer(props: object): any
}>()

const { user } = useUserSession()
const { isMobileOrTablet } = useDevice()
const route = useRoute()
const { loggedIn } = useUserSession()
const { t } = useI18n()

const links = [
  {
    icon: 'i-heroicons-home',
    to: '/',
    label: t('common.home'),
    labelClass: 'sr-only',
  },
  {
    icon: 'i-heroicons-magnifying-glass',
    to: '/search',
    label: t('common.search'),
    labelClass: 'sr-only',
  },
  {
    icon: 'i-heroicons-heart',
    to: '/account/favourites/posts',
    label: t('common.favourites'),
    labelClass: 'sr-only',
  },
  {
    icon: 'i-heroicons-user',
    to: loggedIn.value ? '/account' : `/auth/login?redirect=${route.path}`,
    label: t('common.account'),
    labelClass: 'sr-only',
  },
] as HorizontalNavigationLink[] | HorizontalNavigationLink[][] | undefined

const Footer = computed(() => {
  return isMobileOrTablet
    ? resolveComponent('FooterMobile')
    : resolveComponent('FooterDesktop')
})
</script>

<template>
  <div class="relative">
    <div class="flex min-h-screen flex-col">
      <PageHeader>
        <PageNavbar />
      </PageHeader>
      <div class="grid gap-6">
        <div
          class="
            bg-primary-100

            dark:bg-primary-900

            md:rounded-b-[94px]
          "
        >
          <UserAccountInfo
            v-if="user"
            class="container mx-auto w-full !p-0"
            :account="user"
            :orders-count="0"
            :product-favourites-count="0"
            :product-reviews-count="0"
          />
        </div>
        <main class="container">
          <div
            class="
              relative mb-12

              md:mb-20
            "
          >
            <div
              class="
                flex-1 flex-col

                md:flex md:w-full md:gap-4
              "
            >
              <div
                :class="[
                  'relative mx-auto flex h-full flex-1 flex-col md:w-full lg:flex-row lg:gap-8 xl:gap-0',
                ]"
              >
                <div
                  v-if="!isMobileOrTablet"
                  class="
                    md:grid md:w-auto md:py-4 md:pl-0

                    xl:pl-8
                  "
                  :class="[
                    {
                      'grid w-full': route.path === '/account',
                      'hidden': route.path !== '/account',
                    },
                  ]"
                >
                  <UserSidebar />
                </div>
                <div class="flex w-full flex-col">
                  <slot />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <slot name="footer">
        <Component
          :is="Footer"
        />
      </slot>
    </div>
    <UHorizontalNavigation
      v-if="isMobileOrTablet"
      :links="links"
      class="
        border-primary-200 bg-primary-50 fixed bottom-0 left-0 right-0 z-50
        w-full border-t

        dark:border-primary-700 dark:bg-primary-900
      "
      :ui="{
        container: 'flex justify-between w-full',
        inner: 'flex justify-between w-full',
        base: 'flex flex-col items-center justify-center w-full',
        icon: {
          base: 'text-primary-950 dark:text-primary-50 w-8 h-8',
          active: 'text-secondary dark:text-secondary-dark',
          inactive:
            'text-primary-950 dark:text-primary-50 group-hover:text-primary-950 dark:group-hover:text-primary-950',
        },
      }"
    />
  </div>
</template>
