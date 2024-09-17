<script lang="ts" setup>
import type { LinksOption } from '~/types'

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

const searchBarFocused = useState<boolean>('searchBarFocused')

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

const links = computed(() => {
  const links = [
    {
      icon: 'i-heroicons-home',
      to: '/',
      label: t('home'),
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
      label: t('favourites'),
      labelClass: 'sr-only',
    },
  ] as LinksOption[]

  if (!loggedIn.value) {
    links.push({
      icon: 'i-heroicons-user',
      to: `/account/login?next=${route.path}`,
      label: t('account'),
      labelClass: 'sr-only',
    })
  }
  else {
    links.push({
      to: '/account',
      label: t('account'),
      labelClass: 'sr-only',
      avatar: {
        src: avatarImg.value,
      },
    })
  }

  return links
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
          grid gap-2 pt-[48px]

          lg:pt-[63px]

          md:gap-6 md:pt-[56px]
        "
      >
        <div
          class="
            bg-primary-100

            dark:bg-primary-900

            md:rounded-b-[94px]
          "
        >
          <UserAccountInfo
            v-if="user"
            :account="user"
            :orders-count="0"
            :product-favourites-count="0"
            :product-reviews-count="0"
            class="container mx-auto w-full !p-0"
          />
        </div>
        <main
          class="container" :class="{
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

                    lg:flex-row lg:gap-8

                    md:w-full

                    xl:gap-0
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
      <UHorizontalNavigation
        :links="links"
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
          avatar: {
            size: 'sm',
          },
        }"
        class="
          border-primary-200 bg-primary-50 fixed bottom-0 left-0 right-0 z-50
          w-full border-t

          dark:border-primary-700 dark:bg-primary-900
        "
      />
    </MobileOrTabletOnly>
  </div>
</template>
