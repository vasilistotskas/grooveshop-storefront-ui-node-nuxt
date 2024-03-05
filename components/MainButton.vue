<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonSize, ButtonStyle, ButtonType } from '~/types/global/button'

const props = defineProps({
	text: {
		type: String,
		default: ''
	},
	type: {
		type: String as PropType<ButtonType>,
		default: 'button',
		validator: (value: string) =>
			['button', 'link', 'submit', 'reset', 'input'].includes(value)
	},
	style: {
		type: String as PropType<ButtonStyle>,
		default: 'primary',
		validator: (value: string) =>
			['primary', 'secondary', 'opposite', 'success', 'danger', 'info'].includes(value)
	},
	size: {
		type: String as PropType<ButtonSize>,
		default: 'md',
		validator: (value: string) => ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'].includes(value)
	},
	to: {
		type: [String, Object],
		default: undefined
	},
	href: {
		type: String,
		default: undefined
	}
})

defineSlots<{
	default(props: {}): any
	icon(props: {}): any
}>()

const localePath = useLocalePath()

// state:styles
const defaultStyle = `
  cursor-pointer
  border transition-color duration-300
  focus:outline-none focus:ring-1 focus:ring-offset-1 focus:dark:ring-offset-gray-50 focus:dark:ring-gray-400 focus:ring-gray-600/[0.6] focus:ring-offset-gray-800/[0.6]
  flex items-center justify-center font-semibold;
`
const styles = reactive<{
	[key: string]: string
}>({
	none: '',
	primary:
		'primary-btn text-primary-700 dark:text-primary-100 hover:bg-primary-400 border-primary-500',
	secondary:
		'secondary-btn text-primary-700 dark:text-primary-100 bg-zinc-200 border-gray-200 hover:bg-zinc-300 dark:border-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700',
	opposite:
		'opposite-btn text-primary-700 dark:text-primary-700 bg-zinc-800 hover:bg-white hover:text-primary-800 hover:border-gray-900  dark:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-primary-100 dark:border-white',
	success:
		'success-btn text-white dark:text-white bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700',
	danger:
		'danger-btn text-white dark:text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
	info: 'info-btn text-white dark:text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
})
const sizes = reactive<{
	[key: string]: string
}>({
	lg: 'h-13 px-4 md:px-8 py-2 text-lg rounded-lg',
	md: 'h-10 px-4 md:px-6 text-base rounded',
	sm: 'h-9 px-4 text-sm rounded',
	xs: 'h-6 px-3 text-xs rounded'
})

// state
const selectedStyle = computed(() =>
	styles[props.style] ? styles[props.style] : styles.primary
)
const selectedSize = computed(() => sizes[props.size] || sizes.lg)

// methods
const onClick = async (event: MouseEvent) => {
	if (props.to) {
		await navigateTo(props.to)
	}
	if (!props.href) {
		event.preventDefault()
	}
}
</script>

<template>
  <NuxtLink
    v-if="to && type === 'link'"
    tag="a"
    :aria-label="text"
    :to="localePath(to)"
    :class="`${defaultStyle} ${selectedStyle} ${selectedSize}`"
    :title="text"
  >
    <slot>{{ text }}</slot>
    <slot name="icon" />
  </NuxtLink>
  <button
    v-else-if="type === 'button' || type === 'submit' || type === 'reset'"
    :type="type"
    :class="`${defaultStyle} ${selectedStyle} ${selectedSize}`"
    :aria-label="text"
    :title="text"
    @click="onClick"
  >
    <slot>{{ text }}</slot>
    <slot name="icon" />
  </button>
  <input
    v-else-if="type === 'input'"
    type="submit"
    :value="text"
    :name="text"
    :class="`${defaultStyle} ${selectedStyle} ${selectedSize}`"
    :title="text"
  >
  <a
    v-else
    :class="`${defaultStyle} ${selectedStyle} ${selectedSize}`"
    :href="href"
    :aria-label="text"
    :title="text"
    @click="onClick"
  >
    <slot>{{ text }}</slot>
    <slot name="icon" />
  </a>
</template>
