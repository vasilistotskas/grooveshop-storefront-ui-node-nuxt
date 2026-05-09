<script lang="ts" setup>
defineSlots<{
  default(props: object): any
  header(props: object): any
  footer(props: object): any
}>()

const { t } = useI18n()
const { isMobileOrTablet } = useDevice()
const { $routeBaseName } = useNuxtApp()
const route = useRoute()
const { user, loggedIn } = useUserSession()
const { enabled } = useAuthPreviewMode()

const routeName = computed(() => $routeBaseName(route))
const isProductPage = computed(() => routeName.value === 'products-id-slug')

// Account pages get the user-area chrome (account info banner + sidebar
// on lg+). Single layout, route-aware — replaces the old user.vue.
const isAccountRoute = computed(() => {
  const name = routeName.value
  if (typeof name !== 'string') return false
  return name === 'account' || name.startsWith('account-')
})

const showUserChrome = computed(
  () => isAccountRoute.value && loggedIn.value && user.value,
)

const footerClass = computed(() => {
  if (isProductPage.value) {
    return 'md:pb-0'
  }
  return 'md:pb-0'
})
</script>

<template>
  <div class="relative">
    <a
      href="#main-content"
      class="
        sr-only z-50 rounded-md bg-secondary px-4 py-2 text-sm font-medium
        text-white
        focus:not-sr-only focus:fixed focus:top-2 focus:left-2
      "
    >
      {{ t('a11y.skipToContent') }}
    </a>
    <slot name="header">
      <PageHeader>
        <PageNavbar />
      </PageHeader>
    </slot>
    <UMain
      id="main-content"
      as="main"
    >
      <template v-if="showUserChrome">
        <div class="grid gap-2 md:gap-6">
          <div
            class="
              bg-primary-100
              md:rounded-b-[94px]
              dark:bg-primary-900
            "
          >
            <UserAccountInfo
              v-if="user"
              :account="user"
              :orders-count="0"
              :product-favourites-count="0"
              :product-reviews-count="0"
            />
          </div>
          <div
            class="
              mx-auto w-full max-w-main xl:max-w-300 2xl:max-w-375
              md:p-0!
            "
          >
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
                  class="
                    relative mx-auto flex h-full flex-1 flex-col
                    md:w-full
                    lg:flex-row lg:gap-8
                    xl:gap-4
                  "
                >
                  <aside
                    class="
                      hidden py-4 pl-0 relative
                      lg:block
                      xl:pl-8
                    "
                  >
                    <UserSidebar />
                  </aside>
                  <div class="flex w-full flex-col">
                    <slot />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <section
        v-else
        class="flex w-full flex-1 flex-col"
      >
        <slot />
      </section>
    </UMain>
    <slot name="footer">
      <div :class="footerClass">
        <MobileOrTabletOnly>
          <div
            class="
              my-6 flex flex-wrap items-center justify-center
              md:hidden
            "
          >
            <Socials />
          </div>
        </MobileOrTabletOnly>
        <LazyFooterMobile
          v-if="isMobileOrTablet"
          hydrate-on-visible
        />
        <LazyFooterDesktop
          v-else
          hydrate-on-visible
        />
      </div>
    </slot>
    <MobileBottomNav v-if="enabled" :include-cart="!isAccountRoute" />
  </div>
</template>

<i18n lang="yaml">
el:
  a11y:
    skipToContent: Μετάβαση στο κύριο περιεχόμενο
</i18n>
