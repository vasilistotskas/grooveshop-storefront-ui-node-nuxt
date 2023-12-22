<script lang="ts" setup>
defineSlots<{
	banner(props: {}): any
	title(props: {}): any
	menu(props: {}): any
	drawer(props: { toggleDrawer: () => boolean }): any
	options(props: { toggleOptions: (show?: boolean) => void; showOptions: boolean }): any
}>()

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
	}
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
</script>

<template>
	<div
		ref="navbar"
		class="backdrop-filter backdrop-blur-md top-0 z-50 w-full flex-none transition-colors duration-300 lg:z-50 border-b border-gray-900/10 dark:border-gray-50/[0.2] bg-white/[0.5] dark:bg-zinc-900/[0.5]"
	>
		<div id="navbar-banner" class="banner">
			<slot name="banner" />
		</div>
		<div class="bg-background-700 max-w-8xl w-full mx-auto">
			<div class="py-3 md:py-4 lg:px-8 mx-4 lg:mx-0">
				<div class="relative flex items-center gap-4">
					<!-- drawer:toggle -->
					<div
						v-if="$slots['drawer']"
						class="lg:hidden flex items-center self-center justify-center"
					>
						<button
							type="button"
							class="flex items-center focus:outline-none"
							aria-label="Toggle Drawer Menu"
							@click="toggleDrawer()"
						>
							<span class="hidden">{{
								$t('components.builder.navbar.toggle_drawer_menu')
							}}</span>
							<span
								class="flex items-center text-primary-700 dark:text-primary-100 text-lg"
								aria-hidden="true"
							>
								<IconUil:bars v-if="!showDrawer" />
								<IconUil:times v-else />
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
									class="flex items-center gap-3 overflow-hidden md:w-auto text-md font-bold"
								>
									<span class="text-primary-700 dark:text-primary-100">{{
										appTitle
									}}</span>
								</Anchor>
							</strong>
						</h1>
					</slot>
					<!-- menu -->
					<slot name="menu" />
					<!-- options:toggle -->
					<div v-if="$slots['options']" class="flex-1 flex justify-end lg:hidden">
						<button
							type="button"
							class="flex items-center focus:outline-none"
							aria-label="Toggle Options Menu"
							@click="toggleOptions()"
						>
							<span class="hidden">{{
								$t('components.builder.navbar.toggle_options_menu')
							}}</span>
							<span
								class="flex items-center text-primary-700 dark:text-primary-100 text-sm"
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
						class="fixed lg:hidden bg-zinc-100 dark:bg-zinc-800 pt-16 md:pt-12 top-0 left-0 w-screen h-screen z-30 flex flex-col"
					>
						<div class="flex-1 flex flex-col relative overflow-y-auto">
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
