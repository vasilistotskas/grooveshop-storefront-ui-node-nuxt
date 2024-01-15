<script lang="ts" setup>
import type { RouteLocationRaw } from 'vue-router'

defineProps({
	text: {
		type: String,
		default: ''
	},
	to: {
		type: [String, Object] as PropType<string | RouteLocationRaw>,
		default: undefined
	},
	href: {
		type: String,
		default: ''
	},
	cssClass: {
		type: [String, Object],
		default: ''
	}
})
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<NuxtLinkLocale
		v-if="to"
		tag="a"
		:to="to"
		:aria-label="text"
		:class="[
			cssClass,
			`hover:text-primary-900 transition-colors duration-300 dark:hover:text-white`
		]"
	>
		<slot>{{ text }}</slot>
	</NuxtLinkLocale>
	<ULink
		v-else
		:aria-label="text"
		:active-class="
			[
				cssClass,
				`transition-colors duration-300 dark:hover:text-white hover:text-primary-900`
			].join(' ')
		"
		:inactive-class="
			[
				cssClass,
				`text-gray-700 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200`
			].join(' ')
		"
		:to="href"
	>
		<slot>{{ text }}</slot>
	</ULink>
</template>

<style lang="scss" scoped>
a {
	&.disabled {
		pointer-events: none;
		cursor: default;
		color: #ccc;
	}
}
</style>
