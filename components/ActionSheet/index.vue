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
					<div class="fixed top-60 w-screen z-50 flex" style="max-height: 66.666667%">
						<div
							class="relative max-w-8xl px-4 pb-4 w-full mx-auto flex flex-col flex-1 space-y-1 overflow-y-auto justify-end"
						>
							<slot />
						</div>
					</div>
				</TransitionChild>
			</div>
		</TransitionRoot>
	</Teleport>
</template>

<style lang="scss">
.slide-fade-from-bottom-enter-active {
	transition: all 0.3s ease-out;
}
.slide-fade-from-bottom-leave-active {
	transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-from-bottom-enter-from,
.slide-fade-from-bottom-leave-to {
	transform: translateY(20px);
	opacity: 0;
}
</style>
