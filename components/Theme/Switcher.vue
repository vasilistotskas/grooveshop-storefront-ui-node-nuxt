<script lang="ts" setup>
import { GlobalEvents } from '~/events/global'

const colorMode = useColorMode()
const bus = useEventBus<string>(GlobalEvents.ON_THEME_UPDATED)

const isDark = computed({
	get() {
		return colorMode.value === 'dark'
	},
	set() {
		colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
		bus.emit(GlobalEvents.ON_THEME_UPDATED, {
			isDark: colorMode.value === 'dark'
		})
	}
})
</script>

<template>
	<ClientOnly>
		<UButton
			:icon="isDark ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'"
			color="gray"
			variant="ghost"
			aria-label="Theme"
			size="xl"
			class="p-0"
			@click="isDark = !isDark"
		/>

		<template #fallback>
			<ClientOnlyFallback class="theme-switcher-fallback" width="24px" height="24px" />
		</template>
	</ClientOnly>
</template>

<style lang="scss" scoped>
.theme-switcher-fallback {
	max-width: 24px;
	max-height: 24px;
}
</style>
