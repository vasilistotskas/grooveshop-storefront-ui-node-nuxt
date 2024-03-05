<script lang="ts" setup>
import type { BaseFieldProps, GenericObject } from 'vee-validate'
import type { PropType } from 'vue'

const props = defineProps({
	bind: {
		type: Object as PropType<BaseFieldProps & GenericObject>,
		default: undefined
	},
	placeholder: {
		type: String,
		default: ''
	},
	size: {
		type: String,
		default: 'md',
		validator: (value: string) => ['lg', 'md', 'sm', 'xs'].includes(value)
	},
	type: {
		type: String,
		default: 'text',
		validator: (value: string) =>
			['text', 'password', 'date', 'email', 'number'].includes(value)
	},
	id: {
		type: String,
		default: ''
	},
	name: {
		type: String,
		default: ''
	},
	required: {
		type: Boolean,
		default: false
	},
	autocomplete: {
		type: String,
		default: 'off'
	},
	as: {
		type: String,
		default: 'input'
	}
})

const modelValue = defineModel<string | null>('modelValue', { default: '' })

defineSlots<{
	'prefix-disabled'(props: {}): any
	prefix(props: {}): any
	suffix(props: {}): any
}>()

const slots = useSlots()

// list styles
const paddingStyles = reactive<{
	[key: string]: string
}>({
	xs: 'px-1 py-0.5',
	sm: 'px-2 py-1.5',
	md: 'px-4 py-2',
	lg: 'px-5 py-3'
})
const fontSizeStyles = reactive<{
	[key: string]: string
}>({
	xs: 'text-xs',
	sm: 'text-sm',
	md: 'text-base',
	lg: 'text-lg'
})

// states
const havePreEl = computed(
	() =>
		typeof slots.prefix !== 'undefined' || typeof slots['prefix-disabled'] !== 'undefined'
)
const haveSuEl = computed(() => typeof slots.suffix !== 'undefined')
const selectedBorderStyle = computed(() => 'border-gray-900/10 dark:border-gray-50/[0.2]')
const selectedOnHoverBorderStyle = computed(
	() => 'dark:focus:border-white focus:border-gray-900'
)
const selectedPaddingStyle = computed(() => paddingStyles[props.size] || paddingStyles.md)
const selectedFontSizeStyle = computed(
	() => fontSizeStyles[props.size] || fontSizeStyles.md
)
</script>

<template>
  <div :class="`text-input-container relative flex`">
    <div
      v-if="slots['prefix-disabled']"
      :class="`text-primary-500 flex rounded-l border bg-zinc-100 dark:bg-zinc-800 ${selectedBorderStyle}`"
    >
      <slot name="prefix-disabled" />
    </div>
    <div v-if="slots.prefix" :class="`flex rounded-l border ${selectedBorderStyle}`">
      <slot name="prefix" />
    </div>
    <div class="text-input-wrapper relative flex flex-1">
      <label :for="id" class="sr-only"> {{ name }}</label>
      <input
        :id="id"
        v-model="modelValue"
        v-bind="bind"
        :name="name"
        :class="`text-input text-primary-700 dark:text-primary-100 w-full flex-1 border bg-transparent outline-none ${
          havePreEl ? '' : 'rounded-l'
        } ${
          haveSuEl ? '' : 'rounded-r'
        } ${selectedBorderStyle} ${selectedOnHoverBorderStyle} ${selectedPaddingStyle} ${selectedFontSizeStyle}`"
        :type="type"
        :placeholder="
          type === 'text' || type === 'password' || type === 'email' ? placeholder : ''
        "
        :required="required"
        :autocomplete="autocomplete"
      >
    </div>
    <div v-if="slots.suffix" :class="`flex rounded-r border ${selectedBorderStyle}`">
      <slot name="suffix" />
    </div>
  </div>
</template>
