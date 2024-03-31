<script lang="ts" setup>
import type { HorizontalNavigationLink } from '#ui/types'

defineSlots<{
  default(props: object): any
  header(props: object): any
  footer(props: object): any
}>()

const { loggedIn } = useUserSession()
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const { t } = useI18n()

const links = [
  {
    icon: 'i-heroicons-home',
    to: '/',
    label: t('common.home'),
    labelClass: 'hidden',
  },
  {
    icon: 'i-heroicons-magnifying-glass',
    to: '/search',
    label: t('common.search'),
    labelClass: 'hidden',
  },
  {
    icon: 'i-heroicons-heart',
    to: '/account/favourites',
    label: t('common.favourites'),
    labelClass: 'hidden',
  },
  {
    icon: 'i-heroicons-user',
    to: loggedIn.value ? '/account' : `/auth/login?redirect=${route.path}`,
    label: t('common.account'),
    labelClass: 'hidden',
  },
] as HorizontalNavigationLink[] | HorizontalNavigationLink[][] | undefined
</script>

<template>
  <div class="relative">
    <slot name="header">
      <PageHeader>
        <PageNavbar />
      </PageHeader>
    </slot>
    <main>
      <PageSection class="flex flex-col">
        <div class="flex w-full flex-1 flex-col">
          <slot />
        </div>
      </PageSection>
    </main>
    <slot name="footer">
      <Footer />
    </slot>
    <UHorizontalNavigation
      v-if="isMobileOrTablet"
      :links="links"
      class="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-secondary bg-zinc-50 dark:bg-zinc-900"
      :ui="{
        container: 'flex justify-between w-full',
        inner: 'flex justify-between w-full',
        base: 'flex flex-col items-center justify-center w-full',
        icon: {
          base: 'text-primary-900 dark:text-primary-100 w-6 h-6',
          active: 'text-secondary dark:text-secondary',
          inactive:
            'text-primary-900 dark:text-primary-100 group-hover:text-primary-900 dark:group-hover:text-primary-900',
        },
      }"
    />
  </div>
</template>
