<script lang="ts" setup>
import type { PropType } from 'vue'

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
	},
	gridAutoColumns: {
		type: String,
		required: false,
		default: '100%'
	},
	componentElement: {
		type: String,
		default: 'div'
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
		<Component
			:is="componentElement"
			:class="['native-slider-lg', sliderClass]"
			:data-drag_speed="dragSpeed"
			:data-autoplay_interval="autoplayInterval > 0 ? autoplayInterval : null"
		>
			<slot />
		</Component>
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

<style lang="scss" scoped>
.native-slider {
	position: relative;
	width: 100%;

	&-lg {
		display: grid;
		grid-gap: 0;
		grid-auto-flow: column;
		grid-auto-columns: v-bind(gridAutoColumns);
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		scroll-snap-stop: normal;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		-ms-overflow-style: none;
		padding-bottom: 30px;
		margin-bottom: -30px;
		clip-path: inset(0 0 30px 0);

		&.native-slider-dragged {
			scroll-snap-type: none;
		}
	}

	&-li {
		position: relative;
	}

	&-btn {
		position: absolute;
		top: 50%;
		z-index: 10;
		width: 45px;
		height: 90px;
		transform: translateY(-50%);
		text-indent: -9999px;
		overflow: hidden;
		padding: 0;
		border: 1px solid #ccc;

		&-prev {
			background: url('~/assets/images/slick/prev.png') no-repeat 10px #fff !important;
			border-bottom-right-radius: 90px;
			border-top-right-radius: 90px;
			left: 0;
			box-shadow: -3px 3px 15px -5px rgb(0 0 0 / 35%);
		}

		&-next {
			background: url('~/assets/images/slick/next.png') no-repeat 18px #fff !important;
			border-bottom-left-radius: 90px;
			border-top-left-radius: 90px;
			right: 0;
			box-shadow: 3px 3px 15px -5px rgb(0 0 0 / 35%);
		}
	}
}
</style>
