<script lang="ts" setup>
defineSlots<{
  default(props: object): any
  header(props: object): any
  footer(props: object): any
}>()

const { isMobileOrTablet } = useDevice()
const route = useRoute()
const { loggedIn, user } = useUserSession()
const { t } = useI18n()
const img = useImage()
const { $i18n } = useNuxtApp()

const searchBarFocused = useState<boolean>('search-bar-focused')

const avatarImg = computed(() => {
  if (!user.value || !user.value?.mainImagePath) {
    return ''
  }
  return img(user.value.mainImagePath, {
    width: 32,
    height: 32,
    fit: 'cover',
  }, {
    provider: 'mediaStream',
  })
})

const items = computed(() => {
  const items = [
    {
      icon: 'i-heroicons-home',
      to: '/',
      label: $i18n.t('home'),
      labelClass: 'sr-only',
    },
    {
      icon: 'i-heroicons-magnifying-glass',
      to: '/search',
      label: t('search.title'),
      labelClass: 'sr-only',
    },
    {
      icon: 'i-heroicons-heart',
      to: '/account/favourites/posts',
      label: $i18n.t('favourites'),
      labelClass: 'sr-only',
    },
  ] as LinksOption[]

  if (!loggedIn.value) {
    items.push({
      icon: 'i-heroicons-user',
      to: `/account/login?next=${route.path}`,
      label: $i18n.t('account'),
      labelClass: 'sr-only',
    })
  }
  else if (avatarImg.value) {
    items.push({
      to: '/account',
      label: $i18n.t('account'),
      labelClass: 'sr-only',
      avatar: {
        src: avatarImg.value,
      },
    })
  }
  else {
    items.push({
      icon: 'i-heroicons-user',
      to: '/account',
      label: $i18n.t('account'),
      labelClass: 'sr-only',
    })
  }

  return items
})

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
      <div
        class="
          grid gap-2 pt-[57px]
          md:gap-6 md:pt-[65px]
          lg:pt-[65px]
        "
      >
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
        <main
          class="
            mx-auto w-full max-w-(--container-main)
            md:!p-0
          "
          :class="{
            'opacity-70': searchBarFocused,
          }"
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
                :class="[
                  `
                    relative mx-auto flex h-full flex-1 flex-col
                    md:w-full
                    lg:flex-row lg:gap-8
                    xl:gap-4
                  `,
                ]"
              >
                <DesktopOnly>
                  <div
                    :class="[
                      {
                        'grid w-full': route.path === '/account',
                        'hidden': route.path !== '/account',
                      },
                    ]"
                    class="
                      hidden
                      md:grid md:w-auto md:py-4 md:pl-0
                      xl:pl-8
                    "
                  >
                    <UserSidebar />
                  </div>
                </DesktopOnly>
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
    <MobileOrTabletOnly>
      <UNavigationMenu
        orientation="horizontal"
        :items="items"
        :ui="{
          root: 'border-primary-200 bg-primary-50 fixed bottom-0 left-0 right-0 z-50 bottom-0 left-0 right-0 z-50 block w-full border-t dark:border-primary-700 dark:bg-primary-900',
          list: 'w-full',
          item: 'w-full',
          link: 'flex place-items-center justify-center before:bg-transparent dark:before:bg-transparent',
          linkLabel: 'sr-only',
          linkLeadingIcon: 'size-8',
          linkLeadingAvatar: 'size-8',
        }"
      />
    </MobileOrTabletOnly>
  </div>
</template>
