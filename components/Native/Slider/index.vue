<script lang="ts" setup>
const props = defineProps({
	leftButtonScrollLeftBy: {
		type: Number,
		required: true,
		default: 0
	},
	rightButtonScrollLeftBy: {
		type: Number,
		required: true,
		default: 0
	},
	buttonAlwaysShow: {
		type: Boolean,
		required: false,
		default: false
	},
	dragSpeed: {
		type: Number,
		required: false,
		default: 1
	},
	autoplayInterval: {
		type: Number,
		required: false,
		default: 0
	},
	parentClass: {
		type: String,
		required: false,
		default: ''
	},
	buttonClass: {
		type: String,
		required: false,
		default: ''
	},
	sliderClass: {
		type: String,
		required: false,
		default: ''
	}
})
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<div :class="['native_slider', parentClass]">
		<button
			type="button"
			:data-scroll_left_by="leftButtonScrollLeftBy"
			:data-always_show="buttonAlwaysShow"
			:aria-label="$t('common.previous')"
			:class="['native_slider-btn', 'native_slider-btn-prev', buttonClass]"
		>
			{{ $t('common.previous') }}
		</button>
		<div
			:class="['native_slider-lg', sliderClass]"
			:data-drag_speed="dragSpeed"
			:data-autoplay_interval="autoplayInterval > 0 ? autoplayInterval : null"
		>
			<slot />
		</div>
		<button
			type="button"
			:data-scroll_left_by="rightButtonScrollLeftBy"
			:aria-label="$t('common.next')"
			:data-always_show="buttonAlwaysShow"
			:class="['native_slider-btn', 'native_slider-btn-next', buttonClass]"
		>
			{{ $t('common.next') }}
		</button>
	</div>
</template>
