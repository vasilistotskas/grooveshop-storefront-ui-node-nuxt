<script lang="ts" setup>
defineProps({
	text: {
		type: String,
		default: ''
	},
	to: {
		type: [String, Object],
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
const localePath = useLocalePath()
</script>

<template>
	<NuxtLink
		v-if="to"
		tag="a"
		:to="localePath(to)"
		:aria-label="text"
		:class="[
			cssClass,
			`transition-colors duration-300 dark:hover:text-white hover:text-primary-900`
		]"
	>
		<slot>{{ text }}</slot>
	</NuxtLink>
	<ULink
		v-else
		:aria-label="text"
		:active-class="[
			cssClass,
			`transition-colors duration-300 dark:hover:text-white hover:text-primary-900`
		]"
		:inactive-class="[
			cssClass,
			`text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200`
		]"
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
