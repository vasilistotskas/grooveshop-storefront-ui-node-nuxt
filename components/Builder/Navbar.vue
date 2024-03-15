<script lang="ts" setup>
defineSlots<{
  banner(props: {}): any
  title(props: {}): any
  menu(props: {}): any
  drawer(props: { toggleDrawer: () => boolean }): any
  options(props: {
    toggleOptions: (show?: boolean) => void
    showOptions: boolean
  }): any
}>()

const { loggedIn } = useUserSession()

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
  } else {
    document.body.classList.remove('overflow-hidden')
  }
}
const toggleDrawer = () => (showDrawer.value = !showDrawer.value)
const toggleOptions = (show?: boolean) => {
  if (show) {
    showOptions.value = show
  } else {
    showOptions.value = !showOptions.value
  }
}
const appTitle = computed(() => config.public.appTitle as string)
const environment = computed(() => config.public.environment)
</script>

<template>
  <div
    ref="navbar"
    class="top-0 z-50 w-full flex-none border-b border-gray-900/10 backdrop-blur-md backdrop-filter transition-colors duration-300 dark:border-gray-50/[0.2] lg:z-50"
  >
    <div id="navbar-banner" class="banner">
      <slot name="banner" />
    </div>
    <div class="bg-background-700 mx-auto w-full max-w-8xl">
      <div class="mx-4 py-3 md:py-4 lg:mx-0 lg:px-8">
        <div class="relative flex items-center gap-4">
          <!-- drawer:toggle -->
          <div
            v-if="$slots['drawer']"
            class="flex items-center justify-center self-center lg:sr-only"
          >
            <button
              type="button"
              class="flex items-center focus:outline-none"
              aria-label="Toggle Drawer Menu"
              @click="toggleDrawer()"
            >
              <span class="sr-only">{{
                $t('components.builder.navbar.toggle_drawer_menu')
              }}</span>
              <span
                class="text-primary-700 dark:text-primary-100 flex items-center text-lg"
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
              <strong>
                <Anchor
                  to="/"
                  :aria-label="appTitle"
                  class="text-md flex items-center gap-3 overflow-hidden font-bold md:w-auto"
                >
                  <span class="text-primary-700 dark:text-primary-100">{{
                    appTitle
                  }}</span>
                </Anchor>
              </strong>
            </h1>
          </slot>
          <LazyDemoModeMessage v-if="environment === 'demo' && !loggedIn" />
          <!-- menu -->
          <slot name="menu" />
          <!-- options:toggle -->
          <div
            v-if="$slots['options']"
            class="flex flex-1 justify-end lg:sr-only"
          >
            <button
              type="button"
              class="flex items-center focus:outline-none"
              aria-label="Toggle Options Menu"
              @click="toggleOptions()"
            >
              <span class="sr-only">{{
                $t('components.builder.navbar.toggle_options_menu')
              }}</span>
              <span
                class="text-primary-700 dark:text-primary-100 flex items-center text-sm"
                aria-hidden="true"
              >
                <IconFaSolid:ellipsisV />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <ClientOnly>
      <Teleport to="#app-after">
        <!-- drawer -->
        <Transition name="slide-fade-from-up" mode="out-in">
          <div
            v-if="showDrawer && $slots['drawer']"
            class="fixed left-0 top-0 z-30 flex h-full w-screen flex-col bg-white pt-[75px] dark:bg-zinc-800 md:pt-12 lg:sr-only"
          >
            <div class="relative flex flex-1 flex-col overflow-y-auto">
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
