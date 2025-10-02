<script lang="ts" setup>
import type { RouteNamedMapI18n } from 'vue-router/auto-routes'

defineProps({
  useToggle: {
    type: Boolean,
    default: false,
  },
})

const { $routeBaseName } = useNuxtApp()
const route = useRoute()
const config = useRuntimeConfig()
const { enabled } = useAuthPreviewMode()
const { loggedIn } = useUserSession()
const { isMobileOrTablet } = useDevice()
const { t } = useI18n()
const appStore = useAppStore()
const {
  healthy,
} = storeToRefs(appStore)

const navbar = ref(null)
const isScrolled = ref(false)

const routeName = computed(() => $routeBaseName(route as unknown as keyof RouteNamedMapI18n))
const isPageWithH1 = computed(() => {
  if (!routeName.value) return false
  return ['blog-post-id-slug'].includes(routeName.value)
})

const appTitle = computed(() => config.public.appTitle as string)
const titleElement = computed(() => isPageWithH1.value ? 'div' : 'h1')

const handleScroll = () => {
  isScrolled.value = window.scrollY > 0
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div
    ref="navbar"
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
    <div class="mx-auto max-w-(--container-main) !p-0">
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
                      :alt="appTitle"
                      quality="100"
                      preload
                    />
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
              <LazyLanguageSwitcher v-if="enabled" />
              <UColorModeButton
                class="w-6"
                :ui="{
                  base: 'cursor-pointer hover:bg-transparent p-0',
                  leadingIcon: 'size-6',
                }"
              />
              <LazyUserNotificationsBell v-if="loggedIn" />
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
