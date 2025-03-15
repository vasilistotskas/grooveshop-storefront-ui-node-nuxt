<script lang="ts" setup>
defineSlots<{
  default(props: object): any
  header(props: object): any
  footer(props: object): any
}>()

const { loggedIn, user } = useUserSession()
const route = useRoute()
const { isMobileOrTablet } = useDevice()
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

const links = computed(() => {
  const links = [
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
    links.push({
      icon: 'i-heroicons-user',
      to: `/account/login?next=${route.path}`,
      label: $i18n.t('account'),
      labelClass: 'sr-only',
    })
  }
  else {
    links.push({
      to: '/account',
      label: $i18n.t('account'),
      labelClass: 'sr-only',
      avatar: {
        src: avatarImg.value,
      },
    })
  }

  return links
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
        pt-[55px]

        lg:pt-[63px]

        md:pt-[63px]
      "
      :class="{
        'opacity-70': searchBarFocused,
      }"
    >
      <section class="flex w-full flex-1 flex-col">
        <slot />
      </section>
    </main>
    <slot name="footer">
      <MobileOrTabletOnly>
        <div
          class="md:hidden my-6 flex flex-wrap items-center justify-center"
        >
          <Socials />
        </div>
      </MobileOrTabletOnly>
      <LazyFooterMobile v-if="isMobileOrTablet" hydrate-on-visible />
      <LazyFooterDesktop v-else hydrate-on-visible />
    </slot>
    <LazyMobileOrTabletOnly hydrate-on-visible>
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
            base: 'w-8 h-8',
            size: 'sm' as '2xs',
          },
        }"
        class="
          md:hidden border-primary-200 bg-primary-50 fixed inset-x-0 bottom-0 z-50 w-full
          border-t

          dark:border-primary-700 dark:bg-primary-900
        "
      />
    </LazyMobileOrTabletOnly>
  </div>
</template>
