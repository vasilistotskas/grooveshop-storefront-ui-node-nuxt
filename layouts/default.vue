<script lang="ts" setup>
import type { HorizontalNavigationLink } from '#ui/types'

defineSlots<{
  default(props: object): any
  header(props: object): any
  footer(props: object): any
}>()

const { loggedIn, user } = useUserSession()
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const { t } = useI18n()
const { resolveImageSrc } = useImageResolver()
const img = useImage()

const avatarSrc = computed(() => {
  return resolveImageSrc(
    user.value?.mainImageFilename,
    `media/uploads/users/${user.value?.mainImageFilename}`,
  )
})

const avatarImg = img(avatarSrc.value, {
  width: 32,
  height: 32,
  fit: 'cover',
}, {
  provider: 'mediaStream',
})

const links = shallowRef<HorizontalNavigationLink[]>([
  {
    icon: 'i-heroicons-home',
    to: '/',
    label: t('common.home'),
    labelClass: 'sr-only',
  },
  {
    icon: 'i-heroicons-magnifying-glass',
    to: '/search',
    label: t('common.search.title'),
    labelClass: 'sr-only',
  },
  {
    icon: 'i-heroicons-heart',
    to: '/account/favourites/posts',
    label: t('common.favourites'),
    labelClass: 'sr-only',
  },
])

if (!loggedIn.value && links.value) {
  links.value.push(
    {
      icon: 'i-heroicons-user',
      to: loggedIn.value ? '/account' : `/account/login?redirect=${route.path}`,
      label: t('common.account'),
      labelClass: 'sr-only',
    },
  )
}
else {
  links.value.push(
    {
      to: '/account',
      label: t('common.account'),
      labelClass: 'sr-only',
      avatar: {
        src: avatarImg,
      },
    },
  )
}

const Footer = computed(() => {
  return isMobileOrTablet
    ? resolveComponent('FooterMobile')
    : resolveComponent('FooterDesktop')
})
</script>

<template>
  <div class="relative">
    <slot name="header">
      <PageHeader>
        <PageNavbar />
      </PageHeader>
    </slot>
    <main
      class="
        pt-[48px]

        lg:pt-[63px]

        md:pt-[56px]
      "
    >
      <PageSection class="flex flex-col">
        <div class="flex w-full flex-1 flex-col">
          <slot />
        </div>
      </PageSection>
    </main>
    <slot name="footer">
      <MobileOrTabletOnly>
        <div
          class="mb-6 mt-6 flex flex-wrap items-center justify-center"
        >
          <Socials />
        </div>
      </MobileOrTabletOnly>
      <Component
        :is="Footer"
      />
    </slot>
    <MobileOrTabletOnly>
      <UHorizontalNavigation
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
          avatar: {
            size: 'sm',
          },
        }"
      />
    </MobileOrTabletOnly>
  </div>
</template>
