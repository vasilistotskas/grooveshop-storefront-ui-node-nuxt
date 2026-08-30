<script lang="ts" setup>
defineProps({
  useToggle: {
    type: Boolean,
    default: false,
  },
})

const config = useRuntimeConfig()
const { loggedIn } = useUserSession()
const { isMobileOrTablet } = useDevice()
const { locales } = useI18n()
const isScrolled = ref(false)

const tenantStore = useTenantStore()
const appTitle = computed(() => tenantStore.storeName || (config.public.appTitle as string))

// Cart chrome for shop-dark tenants — mirrors Page/Navbar's gate.
// Shopper-facing chrome fails OPEN.
const cartEnabled = useSettingFlag('CART_ENABLED', { fallback: true })

const handleScroll = () => {
  isScrolled.value = window.scrollY > 0
}

useEventListener('scroll', handleScroll, { passive: true })

onMounted(() => {
  handleScroll()
})
</script>

<template>
  <div
    class="
      top-0 z-50 w-full flex-none backdrop-blur-md
      lg:z-50
    "
    :class="{ 'border-b border-gray-200 dark:border-gray-800': isScrolled }"
  >
    <div
      id="navbar-banner"
    >
      <slot name="banner" />
    </div>
    <!-- Same frame as PageWrapper/UContainer, so the logo lines up with
         the page content underneath it. The old `max-w-main` (1194px,
         no gutters) sat 11px inside the content column on desktop and
         8px outside it on mobile. -->
    <div
      class="
        mx-auto w-full max-w-(--ui-container) px-4
        sm:px-6
        lg:px-8
      "
    >
      <div
        class="
          flex gap-2 py-3
          md:flex md:py-4
        "
      >
        <div
          class="
            relative flex w-full items-center gap-4
            lg:grid lg:grid-cols-[1fr_2fr_1fr]
          "
          :class="{ 'justify-between': isMobileOrTablet }"
        >
          <MobileOrTabletOnly>
            <PageBurgerMenu />
          </MobileOrTabletOnly>
          <slot name="title">
            <!-- The logo is site chrome, never the page heading. It used
                 to render as <h1> on every route except one, taken off a
                 hardcoded allowlist that no page author could be
                 expected to maintain: pages with a real heading ended up
                 with two h1s, and pages without one advertised the store
                 name as their h1. Each page now owns its single h1
                 (PageTitle, or its own markup). -->
            <div class="grid justify-items-start">
              <Anchor
                :to="'index'"
                :aria-label="appTitle"
                class="
                  flex items-center gap-2 overflow-hidden text-base
                  font-bold
                  md:w-auto
                "
              >
                <TenantLogo
                  :width="145"
                  :height="44"
                  priority
                  img-class="
                    object-center
                    lg:object-left
                  "
                />
                <span class="sr-only">{{ appTitle }}</span>
              </Anchor>
            </div>
          </slot>
          <slot name="menu" />
          <MobileOrTabletOnly>
            <div
              class="
                flex items-center gap-4
                lg:sr-only
              "
            >
              <LazySearchInput />
              <CartButton v-if="cartEnabled" />
              <LazyLanguageSwitcher v-if="locales.length > 1" />
              <UColorModeButton
                class="w-6"
                :ui="{
                  base: `
                    cursor-pointer p-0
                    hover:bg-transparent
                  `,
                  leadingIcon: 'size-6',
                }"
              />
              <ClientOnly>
                <LazyUserNotificationsBell v-if="loggedIn" />
                <template #fallback>
                  <UButton
                    v-if="loggedIn"
                    icon="i-heroicons-bell"
                    color="neutral"
                    size="xl"
                    variant="ghost"
                    class="p-0"
                    :ui="{
                      base: `
                        cursor-pointer
                        hover:bg-transparent
                      `,
                    }"
                  />
                </template>
              </ClientOnly>
            </div>
          </MobileOrTabletOnly>
        </div>
      </div>
    </div>
  </div>
</template>
