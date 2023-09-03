<script lang="ts" setup>
const props = defineProps({
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
		type: String,
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
			`transition-colors duration-300 dark:hover:text-white hover:text-gray-900`
		]"
	>
		<slot>{{ text }}</slot>
	</NuxtLink>
	<a
		v-else
		:aria-label="text"
		:class="`transition-colors duration-300 dark:hover:text-white hover:text-gray-900`"
		:href="href"
	>
		<slot>{{ text }}</slot>
	</a>
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
