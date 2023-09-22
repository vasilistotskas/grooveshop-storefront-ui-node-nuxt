<script lang="ts" setup>
const colorMode = useColorMode()

const isDark = computed({
	get() {
		return colorMode.value === 'dark'
	},
	set() {
		colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
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
			@click="isDark = !isDark"
		/>

		<template #fallback>
			<ClientOnlyFallback class="theme-switcher-fallback" />
		</template>
	</ClientOnly>
</template>

<style lang="scss" scoped>
.theme-switcher-fallback {
	max-width: 17px;
	max-height: 17px;
}
</style>
