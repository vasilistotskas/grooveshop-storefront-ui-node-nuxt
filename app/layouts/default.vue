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

const routeName = computed(() => $routeBaseName(route))
const isProductPage = computed(() => routeName.value === 'products-id-slug')

const footerClass = computed(() => {
  if (isProductPage.value) {
    return 'pb-30 md:pb-0'
  }
  return 'pb-12 md:pb-0'
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
      <section class="flex w-full flex-1 flex-col">
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
    <MobileBottomNav />
  </div>
</template>

<i18n lang="yaml">
el:
  a11y:
    skipToContent: Μετάβαση στο κύριο περιεχόμενο
</i18n>
