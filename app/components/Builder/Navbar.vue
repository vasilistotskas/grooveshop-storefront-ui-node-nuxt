<script lang="ts" setup>
import { useScroll } from '@vueuse/core'

defineProps({
  useToggle: {
    type: Boolean,
    default: false,
  },
})

const { $routeBaseName } = useNuxtApp()
const route = useRoute()
const config = useRuntimeConfig()
const { loggedIn } = useUserSession()
const { isMobileOrTablet } = useDevice()
const { t, locales } = useI18n()
const appStore = useAppStore()
const {
  healthy,
} = storeToRefs(appStore)

const navbar = ref(null)

const routeName = computed(() => $routeBaseName(route))
const isPageWithH1 = computed(() => {
  if (!routeName.value) return false
  return ['blog-post-id-slug'].includes(routeName.value as string)
})

const appTitle = computed(() => config.public.appTitle as string)
const titleElement = computed(() => isPageWithH1.value ? 'div' : 'h1')

// Sticky header with hide-on-scroll-down / show-on-scroll-up. The
// previous build only toggled a bottom-border on any scroll; this
// also reclaims ~56px of mobile viewport while the user is reading,
// and restores the bar as soon as they start scrolling back up (the
// retail convention popularised by Shopify, Amazon, Asos).
const { y: scrollY, directions } = useScroll(() =>
  (import.meta.client ? window : null),
{ throttle: 100 },
)

// Keep the nav visible within ~80px of the top so the transition
// doesn't flash on short pages or while the address bar collapses.
const TOP_THRESHOLD = 80

const isScrolled = computed(() => scrollY.value > 0)

const isHidden = computed(() => {
  if (scrollY.value <= TOP_THRESHOLD) return false
  return directions.bottom
})
</script>

<template>
  <div
    ref="navbar"
    class="
      sticky top-0 z-50 w-full flex-none bg-(--ui-bg)/85 backdrop-blur-md
      transition-transform duration-200 ease-out
      motion-reduce:transition-none
      lg:z-50
    "
    :class="[
      isScrolled ? 'border-b border-gray-200 dark:border-gray-800' : '',
      isHidden ? '-translate-y-full' : 'translate-y-0',
    ]"
  >
    <div
      id="navbar-banner"
    >
      <slot name="banner" />
    </div>
    <div class="mx-auto max-w-main p-0!">
      <div
        class="
          mx-2 flex gap-2 py-3
          md:flex md:py-4
          lg:mx-0
        "
      >
        <div
          class="
            relative flex w-full items-center gap-4
            lg:grid lg:grid-cols-[1fr_2fr_1fr]
          "
          :class="{ 'justify-between': isMobileOrTablet }"
        >
          <slot name="title">
            <Component
              :is="titleElement"
              class="grid justify-items-start"
            >
              <UTooltip
                :text="healthy ? '' : t('backend.api.unhealthy')"
              >
                <UChip
                  position="top-left"
                  color="warning"
                  :size="isMobileOrTablet ? 'md' : 'lg'"
                  :show="!healthy"
                >
                  <Anchor
                    :to="'index'"
                    :aria-label="appTitle"
                    class="
                      flex items-center gap-2 overflow-hidden text-base
                      font-bold
                      md:w-auto
                    "
                    :ui="{
                      base: 'p-0',
                    }"
                  >
                    <NuxtImg
                      :style="{ objectFit: 'contain' }"
                      :src="'/img/logo-navbar.svg'"
                      :width="145"
                      :height="30"
                      alt=""
                      quality="80"
                      fetch-priority="high"
                      preload
                    />
                    <span class="sr-only">{{ appTitle }}</span>
                  </Anchor>
                </UChip>
              </UTooltip>
            </Component>
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

<i18n lang="yaml">
el:
  backend:
    api:
      unhealthy: Δεν είναι δυνατή η σύνδεση με τον διακομιστή. Παρακαλώ δοκιμάστε ξανά αργότερα.
</i18n>
