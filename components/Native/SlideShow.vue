<script lang="ts" setup>
defineProps({
	leftButtonScrollLeftBy: {
		type: Number,
		required: false,
		default: -1
	},
	rightButtonScrollLeftBy: {
		type: Number,
		required: false,
		default: 1
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
	<div :class="['native-slider', parentClass]">
		<button
			type="button"
			:data-scroll_left_by="leftButtonScrollLeftBy"
			:data-always_show="buttonAlwaysShow"
			:aria-label="$t('common.previous')"
			:class="['native-slider-btn', 'native-slider-btn-prev', buttonClass]"
		>
			{{ $t('common.previous') }}
		</button>
		<div
			:class="['native-slider-lg', sliderClass]"
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
			:class="['native-slider-btn', 'native-slider-btn-next', buttonClass]"
		>
			{{ $t('common.next') }}
		</button>
	</div>
</template>