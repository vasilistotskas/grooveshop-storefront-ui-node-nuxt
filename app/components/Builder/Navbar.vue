<script lang="ts" setup>
import type { RouteNamedMapI18n } from 'vue-router/auto-routes'

defineProps({
  useToggle: {
    type: Boolean,
    default: false,
  },
})

const { $getRouteBaseName } = useNuxtApp()
const route = useRoute()
const config = useRuntimeConfig()
const { enabled } = useAuthPreviewMode()
const { loggedIn } = useUserSession()
const { isMobileOrTablet } = useDevice()
const { t } = useI18n({ useScope: 'local' })
const appStore = useAppStore()
const {
  healthy,
} = storeToRefs(appStore)

const navbar = ref(null)

const routeName = computed(() => $getRouteBaseName(route as unknown as keyof RouteNamedMapI18n))
const isPageWithH1 = computed(() => {
  if (!routeName.value) return false
  return ['blog-post-id-slug'].includes(routeName.value)
})

const appTitle = computed(() => config.public.appTitle as string)
const titleElement = computed(() => isPageWithH1.value ? 'div' : 'h1')
</script>

<template>
  <div
    ref="navbar"
    class="
      border-primary-500 top-0 z-50 w-full flex-none border-b backdrop-blur-md
      transition-colors duration-300

      dark:border-primary-500

      lg:z-50
    "
  >
    <div
      id="navbar-banner"
      class="banner"
    >
      <slot name="banner" />
    </div>
    <div class="container-sm !p-0">
      <div
        class="
          mx-2 flex gap-2 py-3

          lg:mx-0

          md:flex md:py-4
        "
      >
        <div
          class="
            relative flex w-full items-center gap-4

            lg:grid-cols-[1fr_2fr_1fr]

            md:grid md:grid-cols-[1fr_2fr]
          "
          :class="{ 'justify-between': isMobileOrTablet }"
        >
          <!-- title -->
          <slot name="title">
            <Component
              :is="titleElement"
              class="grid justify-items-start"
            >
              <UTooltip
                :text="healthy ? '' : t('backend.api.unhealthy')"
                :ui="{
                  width: isMobileOrTablet ? 'max-w-xs' : 'max-w-lg',
                }"
              >
                <UChip
                  position="top-left"
                  color="orange"
                  :size="isMobileOrTablet ? 'md' : 'lg'"
                  :show="!healthy"
                >
                  <Anchor
                    :to="'index'"
                    :aria-label="appTitle"
                    class="
                      text-md flex items-center gap-2 overflow-hidden font-bold

                      md:w-auto
                    "
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
          <!-- menu -->
          <slot name="menu" />
          <MobileOrTabletOnly>
            <div
              class="
                flex items-center gap-4

                lg:sr-only
              "
            >
              <LazyLanguageSwitcher v-if="enabled" />
              <ThemeSwitcher />
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
