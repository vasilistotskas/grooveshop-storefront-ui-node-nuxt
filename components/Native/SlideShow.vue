<script lang="ts" setup>
const props = defineProps({
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
	paddingBottom: {
		type: String,
		required: false,
		default: '30px'
	},
	marginBottom: {
		type: String,
		required: false,
		default: '-30px'
	},
	componentElement: {
		type: String,
		default: 'div'
	},
	mobileOnly: {
		type: Boolean,
		required: false,
		default: false
	},
	desktopOnly: {
		type: Boolean,
		required: false,
		default: false
	}
})
defineSlots<{
	default(props: {}): any
}>()

const { isMobile, isDesktop } = useDevice()

const isSliderActive = computed(() => {
	if (props.mobileOnly && isMobile) {
		return true
	}
	if (props.desktopOnly && isDesktop) {
		return true
	}
	return !props.mobileOnly && !props.desktopOnly
})
</script>

<template>
	<div :class="['native-slider', parentClass]">
		<button
			v-if="isSliderActive"
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
			:class="[sliderClass, { 'native-slider-lg': isSliderActive }]"
			:data-drag_speed="isSliderActive ? dragSpeed : null"
			:data-autoplay_interval="
				isSliderActive && autoplayInterval > 0 ? autoplayInterval : null
			"
		>
			<slot />
		</Component>
		<button
			v-if="isSliderActive"
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
		grid-auto-flow: column;
		grid-auto-columns: v-bind(gridAutoColumns);
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		scroll-snap-stop: normal;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		-ms-overflow-style: none;
		padding-bottom: v-bind(paddingBottom);
		margin-bottom: v-bind(marginBottom);
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

		@media screen and (max-width: 768px) {
			display: none;
		}
	}
}
</style>
