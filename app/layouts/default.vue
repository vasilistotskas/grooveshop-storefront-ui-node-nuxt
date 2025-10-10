<script lang="ts" setup>
defineSlots<{
  default(props: object): any
  header(props: object): any
  footer(props: object): any
}>()

const { loggedIn, user } = useUserSession()
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const img = useImage()
const { $i18n } = useNuxtApp()

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
      label: $i18n.t('search.title'),
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
</script>

<template>
  <div class="relative">
    <slot name="header">
      <PageHeader>
        <PageNavbar />
      </PageHeader>
    </slot>
    <UMain
      class="
        pt-[54px]
        md:pt-[62px]
        lg:pt-[62px]
      "
    >
      <section class="flex w-full flex-1 flex-col">
        <slot />
      </section>
    </UMain>
    <slot name="footer">
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
    </slot>
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
