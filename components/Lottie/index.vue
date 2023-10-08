<template :style="getCurrentStyle">
	<ClientOnly>
		<Component
			:is="componentElement"
			:data-id="elementId"
			class="lottie-animation-container circle"
			v-bind="$attrs"
			@mouseenter="hoverStarted"
			@mouseleave="hoverEnded"
		>
			<span class="hidden"></span>
		</Component>
		<template #fallback>
			<ClientOnlyFallback
				:width="width"
				:height="height"
				:show-animation="showClientLoadingAnimation"
			/>
		</template>
	</ClientOnly>
</template>

<script lang="ts">
import Lottie from 'lottie-web'
import { PropType } from 'vue'

export interface LottieProps {
	animationData: any
	animationLink: string
	loop: boolean | number
	autoPlay: boolean
	rendererSettings: 'svg' | 'canvas' | 'html'
	width: number | string
	height: number | string
	speed: number
	delay: number
	direction: string
	pauseOnHover: boolean
	playOnHover: boolean
	backgroundColor: string
	backgroundColorDark: string
	pauseAnimation: boolean
	assetsPath: string
	componentElement: string
	showClientLoadingAnimation: boolean
}

export default defineComponent({
	props: {
		animationData: {
			type: Object as PropType<LottieProps['animationData']>,
			default: () => ({})
		},
		animationLink: {
			type: String as PropType<LottieProps['animationLink']>,
			default: ''
		},
		loop: {
			type: [Boolean, Number] as PropType<LottieProps['loop']>,
			default: true
		},
		autoPlay: {
			type: Boolean as PropType<LottieProps['autoPlay']>,
			default: true
		},
		width: {
			type: [Number, String] as PropType<LottieProps['width']>,
			default: '100%'
		},
		height: {
			type: [Number, String] as PropType<LottieProps['height']>,
			default: '100%'
		},
		speed: {
			type: Number as PropType<LottieProps['speed']>,
			default: 1
		},
		delay: {
			type: Number as PropType<LottieProps['delay']>,
			default: 0
		},
		direction: {
			type: String as PropType<LottieProps['direction']>,
			default: 'forward'
		},
		pauseOnHover: {
			type: Boolean as PropType<LottieProps['pauseOnHover']>,
			default: false
		},
		playOnHover: {
			type: Boolean as PropType<LottieProps['playOnHover']>,
			default: false
		},
		backgroundColor: {
			type: String as PropType<LottieProps['backgroundColor']>,
			default: 'transparent'
		},
		backgroundColorDark: {
			type: String as PropType<LottieProps['backgroundColorDark']>,
			default: 'transparent'
		},
		pauseAnimation: {
			type: Boolean as PropType<LottieProps['pauseAnimation']>,
			default: false
		},
		renderer: {
			type: String as PropType<LottieProps['rendererSettings']>,
			default: 'svg'
		},
		rendererSettings: {
			type: Object as PropType<LottieProps['rendererSettings']>,
			default: () => ({})
		},
		assetsPath: {
			type: String as PropType<LottieProps['assetsPath']>,
			default: ''
		},
		componentElement: {
			type: String as PropType<LottieProps['componentElement']>,
			default: 'div'
		},
		showClientLoadingAnimation: {
			type: Boolean as PropType<LottieProps['showClientLoadingAnimation']>,
			default: true
		}
	},

	emits: {
		onComplete: null,
		onLoopComplete: null,
		onEnterFrame: null,
		onSegmentStart: null,
		onAnimationLoaded: null
	},

	setup(props, { emit: emits }) {
		const lottieAnimation = ref<any>(null)
		const elementId = ref<string>('')
		let direction = 1

		// hack fix supplement for ssr
		const checkIfContainerExists = (elementID: String) => {
			return document.querySelector(`[data-id="${elementID}"]`) !== null
		}

		const loadLottie = async (element: Element) => {
			let autoPlay = props.autoPlay

			if (props.playOnHover) {
				autoPlay = false
			}

			// creating a copy of the animation data to prevent the original data from being modified
			// also needed to render multiple animations on the same page
			let animationData = {}
			if (Object.keys(props.animationData).length !== 0) {
				animationData = { ...props.animationData }
			}

			if (props.animationLink !== '') {
				try {
					const response = await fetch(props.animationLink)
					animationData = await response.json()
				} catch (error) {
					return
				}
			}

			let loop = props.loop

			// drop the loop by one
			if (typeof loop === 'number') {
				if (loop > 0) {
					loop = loop - 1
				}
			}

			if (props.delay > 0) {
				autoPlay = false
			}

			const lottieAnimationConfig: any = {
				container: element,
				renderer: props.renderer,
				loop,
				autoplay: autoPlay,
				animationData,
				assetsPath: props.assetsPath
			}

			if (Object.keys(props.rendererSettings).length !== 0) {
				lottieAnimationConfig.rendererSettings = props.rendererSettings
			}

			// actually load the animation
			lottieAnimation.value = Lottie.loadAnimation(lottieAnimationConfig)

			setTimeout(() => {
				autoPlay = props.autoPlay

				if (props.playOnHover) {
					lottieAnimation.value.pause()
				} else if (autoPlay) {
					lottieAnimation.value.play()
				} else {
					lottieAnimation.value.pause()
				}

				/**
				 * Emit an `onAnimationLoaded` event when the animation is loaded
				 * This should help with times when you want to run functions on the ref of the element
				 */
				emits('onAnimationLoaded')
			}, props.delay)

			lottieAnimation.value.setSpeed(props.speed)

			if (props.direction === 'reverse') {
				lottieAnimation.value.setDirection(-1)
			}
			if (props.direction === 'normal') {
				lottieAnimation.value.setDirection(1)
			}

			if (props.pauseAnimation) {
				lottieAnimation.value.pause()
			} else if (props.playOnHover) {
				lottieAnimation.value.pause()
			}

			// set the emit events
			lottieAnimation.value.addEventListener('loopComplete', () => {
				if (props.direction === 'alternate') {
					lottieAnimation.value.stop()
					direction = direction * -1 // invert direction
					lottieAnimation.value.setDirection(direction)
					lottieAnimation.value.play()
				}
				emits('onLoopComplete')
			})

			lottieAnimation.value.addEventListener('complete', () => {
				emits('onComplete')
			})

			lottieAnimation.value.addEventListener('enterFrame', () => {
				emits('onEnterFrame')
			})

			lottieAnimation.value.addEventListener('segmentStart', () => {
				emits('onSegmentStart')
			})
		}

		// generate the css variables for width, height and background color
		const getCurrentStyle: any = computed(() => {
			let width = props.width
			let height = props.height

			// set to px values if a number is passed
			if (typeof props.width === 'number') {
				width = `${props.width}px`
			}

			if (typeof props.height === 'number') {
				height = `${props.height}px`
			}

			return {
				'--lottie-animation-container-width': width,
				'--lottie-animation-container-height': height,
				'--lottie-animation-container-background-color': props.backgroundColor,
				'--lottie-animation-container-background-color-dark': props.backgroundColorDark
			}
		})

		// function to check if the container is being hovered
		const hoverStarted = () => {
			if (lottieAnimation.value && props.pauseOnHover) {
				lottieAnimation.value.pause()
			}

			if (lottieAnimation.value && props.playOnHover) {
				lottieAnimation.value.play()
			}
		}

		// function to check if the container is no longer being hovered
		const hoverEnded = () => {
			if (lottieAnimation.value && props.pauseOnHover) {
				lottieAnimation.value.play()
			}
			if (lottieAnimation.value && props.playOnHover) {
				lottieAnimation.value.pause()
			}
		}

		// watch for changes in props.pauseAnimation
		watch(
			() => props.pauseAnimation,
			() => {
				// error if pauseAnimation is true and pauseOnHover is also true or playOnHover is also true
				if ((props.pauseOnHover || props.playOnHover) && props.pauseAnimation) {
					// eslint-disable-next-line no-console
					console.error(
						'If you are using pauseAnimation prop, please remove the props pauseOnHover and playOnHover'
					)
					return
				}

				// control the animation play state
				if (lottieAnimation.value) {
					if (props.pauseAnimation) {
						lottieAnimation.value.pause()
					} else {
						lottieAnimation.value.play()
					}
				}
			}
		)

		// method to play the animation
		const play = () => {
			if (lottieAnimation.value) {
				lottieAnimation.value.play()
			}
		}

		// method to pause the animation
		const pause = () => {
			if (lottieAnimation.value) {
				lottieAnimation.value.pause()
			}
		}

		// method to stop the animation. It will reset the animation to the first frame
		const stop = () => {
			if (lottieAnimation.value) {
				lottieAnimation.value.stop()
			}
		}

		const destroy = () => {
			if (lottieAnimation.value) {
				lottieAnimation.value.destroy()
			}
		}

		const setSpeed = (speed = 1) => {
			// speed: 1 is normal speed.

			if (speed <= 0) {
				throw new Error('Speed must be greater than 0')
			}

			if (lottieAnimation.value) {
				lottieAnimation.value.setSpeed(speed)
			}
		}

		const setDirection = (direction: 'forward' | 'reverse') => {
			if (lottieAnimation.value) {
				if (direction === 'forward') {
					lottieAnimation.value.setDirection(1)
				} else if (direction === 'reverse') {
					lottieAnimation.value.setDirection(-1)
				}
			}
		}

		const goToAndStop = (frame: number, isFrame: Boolean = true) => {
			// value: numeric value.
			// isFrame: defines if first argument is a time based value or a frame based (default true).
			if (lottieAnimation.value) {
				lottieAnimation.value.goToAndStop(frame, isFrame)
			}
		}

		const goToAndPlay = (frame: number, isFrame: Boolean = true) => {
			// value: numeric value
			// isFrame: defines if first argument is a time based value or a frame based (default true).

			if (lottieAnimation.value) {
				lottieAnimation.value.goToAndPlay(frame, isFrame)
			}
		}

		const playSegments = (segments: Array<number>, forceFlag: Boolean = false) => {
			// segments: array. Can contain 2 numeric values that will be used as first and last frame of the animation. Or can contain a sequence of arrays each with 2 numeric values.
			// forceFlag: boolean. If set to false, it will wait until the current segment is complete. If true, it will update values immediately.

			if (lottieAnimation.value) {
				lottieAnimation.value.playSegments(segments, forceFlag)
			}
		}

		const setSubFrame = (useSubFrame: Boolean = true) => {
			// useSubFrames: If false, it will respect the original AE fps. If true, it will update on every requestAnimationFrame with intermediate values. Default is true.
			if (lottieAnimation.value) {
				lottieAnimation.value.setSubframe(useSubFrame)
			}
		}

		const getDuration = (inFrames: Boolean = true) => {
			if (lottieAnimation.value) {
				return lottieAnimation.value.getDuration(inFrames)
			}
		}

		const updateDocumentData = (documentData: any, index = 0) => {
			if (lottieAnimation.value) {
				lottieAnimation.value.renderer.elements[index].updateDocumentData(documentData)
			}
		}

		// function to generate random strings for IDs
		const makeId = (length: number) => {
			let result = ''
			const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
			const charactersLength = characters.length
			for (let i = 0; i < length; i++) {
				result += characters.charAt(Math.floor(Math.random() * charactersLength))
			}
			return result
		}

		const setupLottie = (elementID: String) => {
			if (props.pauseOnHover && props.playOnHover) {
				throw new Error(
					'You cannot set pauseOnHover and playOnHover for Vue3-Lottie at the same time.'
				)
			}

			if (props.animationLink === '' && Object.keys(props.animationData).length === 0) {
				throw new Error('You must provide either animationLink or animationData')
			}

			// Unfortunately, this is a hack-fix for ssr. We need to wait for the element to be rendered before we can load the animation.
			// One day I will figure out how to do this properly.
			const interval = setInterval(() => {
				if (checkIfContainerExists(elementID)) {
					clearInterval(interval)
					const element = document.querySelector(`[data-id="${elementID}" ]`)

					if (element) {
						loadLottie(element) // load the animation
					}
				}
			}, 0)
		}

		onMounted(async () => {
			elementId.value = makeId(20) // generate a random id for the container
			await setupLottie(elementId.value)
		})

		return {
			elementId,
			hoverEnded,
			hoverStarted,
			getCurrentStyle,
			play,
			pause,
			stop,
			destroy,
			setSpeed,
			setDirection,
			goToAndStop,
			goToAndPlay,
			playSegments,
			setSubFrame,
			getDuration,
			updateDocumentData
		}
	}
})
</script>

<style scoped lang="scss">
.lottie-animation-container {
	width: v-bind(width);
	height: v-bind(height);
	background-color: v-bind(backgroundColor);
	overflow: hidden;
}
</style>
