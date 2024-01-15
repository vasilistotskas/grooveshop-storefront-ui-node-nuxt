<script lang="ts" setup>
import { TransitionChild, TransitionRoot } from '@headlessui/vue'

defineSlots<{
	default(props: {}): any
}>()

const emit = defineEmits(['onClose'])

const show = ref(false)

const close = () => {
	show.value = false
	setTimeout(() => emit('onClose'), 100)
}

onMounted(() => {
	setTimeout(() => (show.value = true), 100)
})

watch(
	() => useRoute().path,
	() => {
		if (show.value) close()
	}
)
</script>

<template>
	<Teleport to="body">
		<TransitionRoot :show="show" appear>
			<div>
				<ActionSheetOverlay @click="close" />
				<TransitionChild
					as="template"
					enter="duration-300 ease-out"
					enter-from="opacity-0"
					enter-to="opacity-100"
					leave="duration-300 ease-in"
					leave-from="opacity-100"
					leave-to="opacity-0"
				>
					<div class="fixed top-60 z-50 flex w-screen" style="max-height: 66.6667%">
						<div
							class="relative mx-auto flex w-full max-w-8xl flex-1 flex-col justify-end space-y-1 overflow-y-auto px-4 pb-4"
						>
							<slot />
						</div>
					</div>
				</TransitionChild>
			</div>
		</TransitionRoot>
	</Teleport>
</template>
