<script lang="ts" setup>
defineSlots<{
  default(props: object): any
  header(props: object): any
  footer(props: object): any
}>()

const { isMobileOrTablet } = useDevice()
const { user } = useUserSession()

const Footer = computed(() => {
  return isMobileOrTablet.value
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
        class="grid gap-2 md:gap-6"
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
                :class="[
                  `
                    relative mx-auto flex h-full flex-1 flex-col
                    md:w-full
                    lg:flex-row lg:gap-8
                    xl:gap-4
                  `,
                ]"
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
        </main>
      </div>

      <slot name="footer">
        <Component
          :is="Footer"
        />
      </slot>
    </div>
    <MobileBottomNav :include-cart="false" />
  </div>
</template>
