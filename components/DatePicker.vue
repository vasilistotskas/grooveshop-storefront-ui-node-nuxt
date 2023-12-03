<script setup lang="ts">
const modelValue = defineModel<Date | null>('modelValue', { default: null })

const emit = defineEmits(['close'])

const colorMode = useColorMode()
const { locale } = useLang()

const isDark = computed(() => colorMode.value === 'dark')

const date = computed({
	get: () => modelValue.value,
	set: (value) => {
		modelValue.value = value
		emit('close')
	}
})

const attrs = [
	{
		key: 'today',
		highlight: {
			color: 'blue',
			fillMode: 'outline',
			class: '!bg-gray-100 dark:!bg-gray-800'
		},
		dates: new Date()
	}
]
</script>

<template>
	<VDatePicker
		v-model="date"
		transparent
		borderless
		:attributes="attrs"
		:is-dark="isDark"
		:locale="locale"
		title-position="left"
		trim-weeks
		:first-day-of-week="2"
	/>
</template>
