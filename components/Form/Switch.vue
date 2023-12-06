<script lang="ts" setup>
const props = defineProps({
	modelValue: {
		type: Boolean,
		default: false
	},
	on: {
		type: Boolean,
		default: false
	},
	id: {
		type: String,
		default: undefined
	}
})
defineSlots<{
	default(props: {}): any
}>()

const emit = defineEmits(['update:modelValue'])
const { modelValue, on, id } = toRefs(props)

const randomId = () =>
	Math.random().toString(36).substring(2, 15) +
	Math.random().toString(36).substring(2, 15)

const switchId = ref(id?.value || randomId())
const input = ref<HTMLInputElement>()

const checked = useSyncProps<boolean>(props, 'modelValue', emit)
const onInputChange = (e: Event) => {
	const target = e.target as HTMLInputElement
	checked.value = target.checked
	emit('update:modelValue', target.checked)
}

onMounted(() => {
	if (props.on) {
		checked.value = true
		emit('update:modelValue', true)
		if (input.value)
			if ('checked' in input.value) {
				input.value.checked = true
			}
	}
})
</script>

<template>
	<label :for="switchId" class="flex cursor-pointer">
		<label
			:for="switchId"
			class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in"
		>
			<input
				:id="switchId"
				ref="input"
				type="checkbox"
				class="switch-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-slate-600 appearance-none cursor-pointer"
				:checked="checked"
				name="switch"
				placeholder="Switch"
				@change="onInputChange"
			/>
			<label
				:for="switchId"
				class="switch-label block overflow-hidden h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 cursor-pointer border border-slate-300 dark:border-slate-500"
			/>
		</label>
		<slot />
	</label>
</template>

<style>
.switch-checkbox:checked {
	right: 0;
}
</style>
