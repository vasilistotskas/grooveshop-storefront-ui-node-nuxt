<script lang="ts" setup>
defineProps({
  useToggle: {
    type: Boolean,
    default: false,
  },
})

const { isMobileOrTablet } = useDevice()

const navbar = ref(null)
const showDrawer = useState<boolean>('navbar.showDrawer', () => false)
const showOptions = useState<boolean>('navbar.showOptions', () => false)

const config = useRuntimeConfig()

let timer: NodeJS.Timer
watch(
  () => useRoute().path,
  () => {
    if (showDrawer.value) {
      timer = setTimeout(() => {
        showDrawer.value = false
      }, 100)
    }
  },
)
onMounted(() => {
  if (!navbar.value) return

  // scroll
  const { onScroll } = useSticky(navbar.value as HTMLElement, 0)
  setTimeout(() => onScroll(), 50)

  // on show on mobile
  setInterval(() => {
    // must in mobile
    const minW = 1024
    if (window.innerWidth < minW) {
      updateDrawerOptions()
    }
  }, 100)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(Number(timer))
})

const updateDrawerOptions = () => {
  // drawer
  if (showDrawer.value || showOptions.value) {
    document.body.classList.add('overflow-hidden')
  }
  else {
    document.body.classList.remove('overflow-hidden')
  }
}
const toggleDrawer = () => (showDrawer.value = !showDrawer.value)
const toggleOptions = (show?: boolean) => {
  if (show) {
    showOptions.value = show
  }
  else {
    showOptions.value = !showOptions.value
  }
}
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
      top-0 z-50 w-full flex-none border-b border-gray-900/10 backdrop-blur-md
      backdrop-filter transition-colors duration-300

      dark:border-gray-50/[0.2]

      lg:z-50
    "
  >
    <div id="navbar-banner" class="banner">
      <slot name="banner" />
    </div>
    <div class="bg-background-700 mx-auto w-full max-w-8xl">
      <div
        class="
          mx-4 py-3

          lg:mx-0 lg:px-8

          md:py-4
        "
      >
        <div class="relative flex items-center justify-between gap-4">
          <!-- drawer:toggle -->
          <div
            v-if="$slots['drawer']"
            class="
              flex items-center justify-center self-center

              lg:sr-only
            "
          >
            <button
              type="button"
              class="
                flex items-center

                focus:outline-none
              "
              aria-label="Toggle Drawer Menu"
              @click="toggleDrawer()"
            >
              <span class="sr-only">{{
                $t('components.builder.navbar.toggle_drawer_menu')
              }}</span>
              <span
                class="
                  text-primary-950 flex items-center text-lg

                  dark:text-primary-50
                "
                aria-hidden="true"
              >
                <UIcon v-if="!showDrawer" name="i-heroicons-bars-3" />
                <UIcon v-else name="i-heroicons-x-circle" />
              </span>
            </button>
          </div>
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
                  class="h-full w-full"
                  :style="{ objectFit: 'contain' }"
                  :src="spider"
                  :width="24"
                  :height="24"
                  :alt="'Main Banner'"
                  loading="eager"
                  format="webp"
                  densities="x1"
                  preload
                />
                <NuxtImg
                  class="h-full w-full"
                  :style="{ objectFit: 'contain' }"
                  :src="logo"
                  :width="140"
                  :height="24"
                  :alt="'Main Banner'"
                  loading="eager"
                  format="webp"
                  densities="x1"
                  preload
                />
                <span class="sr-only">{{ appTitle }}</span>
              </Anchor>
            </h1>
          </slot>
          <!-- menu -->
          <slot name="menu" />
          <!-- options:toggle -->
          <div
            v-if="$slots['options'] && useToggle"
            class="
              flex flex-1 justify-end

              lg:sr-only
            "
          >
            <button
              type="button"
              class="
                flex items-center

                focus:outline-none
              "
              aria-label="Toggle Options Menu"
              @click="toggleOptions()"
            >
              <span class="sr-only">{{
                $t('components.builder.navbar.toggle_options_menu')
              }}</span>
              <span
                class="
                  text-primary-950 flex items-center text-sm

                  dark:text-primary-50
                "
                aria-hidden="true"
              >
                <IconFaSolid:ellipsisV />
              </span>
            </button>
          </div>
          <div
            v-else-if="isMobileOrTablet"
            class="
              flex items-center gap-4

              lg:sr-only
            "
          >
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </div>
    <ClientOnly>
      <Teleport to="#teleports">
        <!-- drawer -->
        <Transition name="slide-fade-from-up" mode="out-in">
          <div
            v-if="showDrawer && $slots['drawer']"
            class="
              bg-primary-100 fixed left-0 top-0 z-30 flex h-full w-screen
              flex-col pt-[80px]

              dark:bg-primary-900

              lg:sr-only

              md:pt-12
            "
          >
            <div class="relative flex flex-1 flex-col overflow-y-auto px-4">
              <slot name="drawer" :toggle-drawer="toggleDrawer" />
            </div>
          </div>
        </Transition>

        <!-- options -->
        <div v-if="showOptions && $slots['options']">
          <slot
            name="options"
            :toggle-options="toggleOptions"
            :show-options="showOptions"
          />
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>
