<script lang="ts" setup>
defineSlots<{
  default(props: object): any
  header(props: object): any
  footer(props: object): any
}>()

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
    <slot name="header">
      <PageHeader>
        <PageNavbar />
      </PageHeader>
    </slot>
    <UMain
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
