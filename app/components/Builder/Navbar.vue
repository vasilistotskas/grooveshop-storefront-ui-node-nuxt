<script lang="ts" setup>
defineProps({
  useToggle: {
    type: Boolean,
    default: false,
  },
})

const navbar = ref(null)

const config = useRuntimeConfig()
const { enabled } = useAuthPreviewMode()
const { loggedIn } = useUserSession()
const { isMobileOrTablet } = useDevice()

const appTitle = computed(() => config.public.appTitle as string)

const colorModeCookie = useCookie(
  'color-mode',
)

const logo = computed(() => {
  return colorModeCookie.value === 'dark'
    ? '/img/logo-dark-mode.png'
    : '/img/logo-light-mode.png'
})

const spider = computed(() => {
  return colorModeCookie.value === 'dark'
    ? '/img/spider-dark-mode.png'
    : '/img/spider-light-mode.png'
})
</script>

<template>
  <div
    ref="navbar"
    class="
      top-0 z-50 w-full flex-none border-b border-primary-500 backdrop-blur-md
      backdrop-filter transition-colors duration-300

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
          ml-2 mr-2 flex gap-2 py-3

          lg:mx-0

          md:flex md:py-4
        "
      >
        <MobileOrTabletOnly>
          <BackButton />
        </MobileOrTabletOnly>
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
            <h1>
              <Anchor
                to="/"
                :aria-label="appTitle"
                class="
                  text-md flex items-center gap-2 overflow-hidden font-bold

                  md:w-auto
                "
              >
                <NuxtImg
                  :style="{ objectFit: 'contain' }"
                  :src="spider"
                  :width="23"
                  :height="23"
                  :alt="'Website Spider'"
                  loading="eager"
                  format="webp"
                  quality="100"
                  densities="x1"
                  preload
                />
                <NuxtImg
                  :style="{ objectFit: 'contain' }"
                  :src="logo"
                  :width="114"
                  :height="23"
                  :alt="'website.gr'"
                  :modifiers="{
                    position: 'center',
                    trimThreshold: 5,
                  }"
                  loading="eager"
                  format="webp"
                  quality="100"
                  preload
                />
                <span class="sr-only">{{ appTitle }}</span>
              </Anchor>
            </h1>
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
              <LanguageSwitcher v-if="enabled" />
              <ThemeSwitcher />
              <UserNotifications v-if="loggedIn" />
            </div>
          </MobileOrTabletOnly>
        </div>
      </div>
    </div>
  </div>
</template>
