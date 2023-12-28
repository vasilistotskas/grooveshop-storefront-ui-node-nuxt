import { v4 as uuidv4 } from 'uuid'

interface RenderQueueEntry {
	el: HTMLElement | (Element & Record<'dataset', unknown>)
	interval: number
	lastUpdated: number
	command: {
		handle: string
		data: any
	}
}

interface NativeSliderInstance {
	[key: string]: any
	intersectionObserver: IntersectionObserver | null
	pollingInterval: number
	deltaPadding: number
	diffThreshold: number
	renderLoopTimingBelt: NodeJS.Timer | null
	renderQueue: Set<HTMLElement> | null
	classList: {
		draggable: string
		visible: string
		centered: string
		listGroup: string
		listItem: string
		button: string
		buttonNext: string
		buttonPrev: string
	}
	events: {
		nativeSliderRenderLoopPreUpdate: {
			handle: string
			enabled: boolean
		}
		nativeSliderPostUpdate: {
			enabled: boolean
			handle: string
			options: {
				causes: {
					[key: string]: string
				}
			}
		}
	}
	dragDataLayer: Map<any, any> | null
	visibleSlides: {
		[key: string]: Element[]
	}
	initIntersectionObserver(): void
	listenerSliderSlideButtonClick(event: Event | MouseEvent): void
	getAxisAccessors(axis: string): {
		offset: string
		page: string
		scroll: string
	}
	listenerSliderXYDragMousedown(
		nativeSlider: HTMLElement & { [key: string]: any },
		event: Event | MouseEvent | TouchEvent
	): void
	listenerSliderXYDragMouseleave(
		nativeSlider: HTMLElement & { [key: string]: any },
		event: Event | MouseEvent | TouchEvent
	): void
	listenerSliderXYDragMouseup(
		nativeSlider: HTMLElement & { [key: string]: any },
		event: Event | MouseEvent | TouchEvent
	): void
	listenerSliderXYDragMousemove(
		nativeSlider: HTMLElement & { [key: string]: any },
		event: Event | MouseEvent | TouchEvent
	): void
	getSliderFromButton(button: Element | HTMLElement): Element | HTMLElement | null
	slideNativeSliderCommand(
		nativeSlider: HTMLElement,
		{ direction }: { direction: number }
	): void
	slideNativeSliderBy(slider: HTMLElement | Element, scrollLeftBy: number): void
	markVisibleSlides(slider: HTMLElement): void
	update({ renderQueue }: { renderQueue: any }): void
	dispatchNativeSliderPostUpdate(
		slider: HTMLElement | Element,
		cause: string,
		payload: any
	): void
	dispatchNativeSliderRenderLoopPreUpdate(): void
	createNewRenderQueueEntry(
		el: HTMLElement | (Element & Record<'dataset', unknown>),
		commandHandle: string,
		commandData: any,
		interval: number
	): RenderQueueEntry
	initButtons(target: Document | null): void
	initSliders(target: Document | null): void
	initRenderLoop(): void
	initSlidersWithButtons(target?: Document | null): void
	isInViewport(element: HTMLElement): boolean
	disconnectIntersectionObserver(): void
	cleanupListeners(nativeSlider: HTMLElement): void
	cleanupButtons(nativeSliderButton: HTMLElement): void
	cleanUpNativeSlider(): void
	init(): void
}

export function NativeSlider() {
	const nativeSliderInstance: NativeSliderInstance = {
		intersectionObserver: null,
		pollingInterval: 1000,
		deltaPadding: 0.1,
		diffThreshold: 1,
		renderLoopTimingBelt: null,
		renderQueue: null,
		classList: {
			draggable: 'native-slider-dragged',
			visible: 'native-slider-visible',
			centered: 'native-slider-centered',
			listGroup: 'native-slider-lg',
			listItem: 'native-slider-li',
			button: 'native-slider-btn',
			buttonNext: 'native-slider-btn-next',
			buttonPrev: 'native-slider-btn-prev'
		},
		events: {
			nativeSliderRenderLoopPreUpdate: {
				handle: 'nativeSliderRenderLoopPreUpdate',
				enabled: true
			},
			nativeSliderPostUpdate: {
				enabled: false,
				handle: 'nativeSliderPostUpdate',
				options: {
					causes: {
						renderLoopAnimationUpdate: 'renderLoopAnimationUpdate',
						renderLoopUpdate: 'renderLoopUpdate',
						mouseleave: 'mouseleave',
						mousemove: 'mousemove',
						mousedown: 'mousedown',
						mouseup: 'mouseup',
						button: 'button'
					}
				}
			}
		},
		dragDataLayer: null,
		visibleSlides: {},

		initIntersectionObserver() {
			const options = {
				root: null, // observing for visibility within the viewport
				rootMargin: '0px',
				threshold: 0.1 // 10% of the item's visible area
			}

			this.intersectionObserver = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					const slider = entry.target.closest(`.${this.classList.listGroup}`)
					const sliderUuid = (slider as HTMLElement).dataset.slider_uuid

					if (sliderUuid) {
						if (!this.visibleSlides[sliderUuid]) {
							this.visibleSlides[sliderUuid] = []
						}
					}

					if (entry.isIntersecting) {
						entry.target.classList.add(this.classList.visible)
						if (sliderUuid) {
							if (!this.visibleSlides[sliderUuid].includes(entry.target)) {
								this.visibleSlides[sliderUuid].push(entry.target)
							}
						}
					} else {
						entry.target.classList.remove(this.classList.visible)
						if (sliderUuid) {
							this.visibleSlides[sliderUuid] = this.visibleSlides[sliderUuid].filter(
								(slide) => slide !== entry.target
							)
						}
					}
				})
				this.updateCenteredSlide()
			}, options)
		},

		updateCenteredSlide() {
			Object.keys(this.visibleSlides).forEach((sliderUuid) => {
				const visibleSlides = this.visibleSlides[sliderUuid]

				visibleSlides.sort((a, b) => {
					return a.getBoundingClientRect().left - b.getBoundingClientRect().left // Or 'top' for vertical sliders
				})

				visibleSlides.forEach((slide) => slide.classList.remove(this.classList.centered))

				if (visibleSlides.length % 2 !== 0) {
					const centerIndex = Math.floor(visibleSlides.length / 2)
					visibleSlides[centerIndex].classList.add(this.classList.centered)
				}
			})
		},

		listenerSliderSlideButtonClick(e) {
			if (!e.target || !('dataset' in e.target)) {
				return
			}
			const scrollLeftBy = (e.target as HTMLElement).dataset.scroll_left_by
			const slider = this.getSliderFromButton(e.target as HTMLElement)
			if (slider === null || !scrollLeftBy) {
				return
			}
			this.slideNativeSliderBy(slider, Number(scrollLeftBy))
			this.dispatchNativeSliderPostUpdate(
				slider,
				this.events.nativeSliderPostUpdate.options.causes.button,
				e
			)
		},

		getAxisAccessors(axis: string) {
			const accessors = {
				offset: 'offsetTop',
				page: 'pageY',
				scroll: 'scrollTop'
			}
			if (axis === 'x') {
				accessors.offset = 'offsetLeft'
				accessors.page = 'pageX'
				accessors.scroll = 'scrollLeft'
			}
			return accessors
		},

		listenerSliderXYDragMousedown(nativeSlider, e) {
			if (!this.dragDataLayer) {
				return
			}
			const dragData = this.dragDataLayer.get(nativeSlider)
			const accessors = this.getAxisAccessors(dragData.scrollMode)

			if (!dragData) {
				return
			}

			dragData.isDown = true
			nativeSlider.classList.add(this.classList.draggable)
			dragData.startXY =
				Number(e[accessors.page as keyof typeof e]?.toString()) -
				Number(nativeSlider[accessors.offset as keyof HTMLElement]?.toString())
			dragData.scrollLeftTop = Number(
				nativeSlider[accessors.scroll as keyof HTMLElement]?.toString()
			)
			this.dispatchNativeSliderPostUpdate(
				nativeSlider,
				this.events.nativeSliderPostUpdate.options.causes.mousedown,
				e
			)
			this.dragDataLayer.set(nativeSlider, dragData)
		},

		listenerSliderXYDragMouseleave(nativeSlider, e) {
			if (!this.dragDataLayer) {
				return
			}
			const dragData = this.dragDataLayer.get(nativeSlider)

			if (!dragData) {
				return
			}

			dragData.isDown = false
			nativeSlider.classList.remove(this.classList.draggable)
			this.dispatchNativeSliderPostUpdate(
				nativeSlider,
				this.events.nativeSliderPostUpdate.options.causes.mouseleave,
				e
			)
			this.dragDataLayer.set(nativeSlider, dragData)
		},

		listenerSliderXYDragMouseup(nativeSlider, e) {
			if (!this.dragDataLayer) {
				return
			}
			const dragData = this.dragDataLayer.get(nativeSlider)

			if (!dragData) {
				return
			}

			dragData.isDown = false
			nativeSlider.classList.remove(this.classList.draggable)
			this.dispatchNativeSliderPostUpdate(
				nativeSlider,
				this.events.nativeSliderPostUpdate.options.causes.mouseup,
				e
			)
			this.dragDataLayer.set(nativeSlider, dragData)
		},

		listenerSliderXYDragMousemove(nativeSlider, e) {
			if (!this.dragDataLayer) {
				return
			}
			const dragData = this.dragDataLayer.get(nativeSlider)

			if (!dragData.isDown) {
				return
			}

			const accessors = this.getAxisAccessors(dragData.scrollMode)
			e.preventDefault()
			const xy =
				Number(e[accessors.page as keyof typeof e]?.toString()) -
				nativeSlider[accessors.offset]
			const walk = (xy - dragData.startXY) * Number(nativeSlider.dataset.drag_speed)
			nativeSlider[accessors.scroll] = dragData.scrollLeftTop - walk
			this.dispatchNativeSliderPostUpdate(
				nativeSlider,
				this.events.nativeSliderPostUpdate.options.causes.mousemove,
				e
			)
		},

		getSliderFromButton(button) {
			if (button instanceof HTMLElement) {
				return (
					(button.parentNode as Element)?.getElementsByClassName(
						this.classList.listGroup
					)[0] || null
				)
			}
			return null
		},

		slideNativeSliderCommand(slider, { direction }) {
			const scrollPosition = slider.scrollWidth - slider.clientWidth
			const scrollPositionLeft = scrollPosition - slider.scrollLeft
			const scrollPositionRight = scrollPosition - scrollPositionLeft
			const hasReachedLimit =
				direction === 1
					? scrollPositionLeft < this.diffThreshold
					: scrollPositionRight < this.diffThreshold
			direction *= hasReachedLimit ? -1 : 1
			this.slideNativeSliderBy(slider, direction)
			return { direction }
		},

		slideNativeSliderBy(slider, scrollLeftBy) {
			const firstChildWidth = slider.children[0].getBoundingClientRect().width
			const directionLeft = firstChildWidth * scrollLeftBy
			slider.scrollBy({
				top: 0,
				left: directionLeft,
				behavior: 'smooth'
			})
		},

		markVisibleSlides(slider: HTMLElement) {
			const slides = slider.getElementsByClassName(this.classList.listItem)

			for (const slide of slides) {
				if (this.isInViewport(slide as HTMLElement)) {
					slide.classList.add(this.classList.visible)
				} else {
					slide.classList.remove(this.classList.visible)
				}
			}
		},

		update({ renderQueue }: { renderQueue: RenderQueueEntry[] }) {
			for (const renderQueueEntry of renderQueue) {
				this.dispatchNativeSliderPostUpdate(
					renderQueueEntry.el,
					this.events.nativeSliderPostUpdate.options.causes.renderLoopUpdate,
					renderQueueEntry
				)
				const nextUpdateTS = renderQueueEntry.lastUpdated + renderQueueEntry.interval
				const dateDiff = nextUpdateTS - Date.now()
				if (dateDiff > 0) {
					continue
				}
				window.requestAnimationFrame(() => {
					renderQueueEntry.command.data = this[renderQueueEntry.command.handle](
						renderQueueEntry.el,
						renderQueueEntry.command.data
					)
					this.dispatchNativeSliderPostUpdate(
						renderQueueEntry.el,
						this.events.nativeSliderPostUpdate.options.causes.renderLoopAnimationUpdate,
						renderQueueEntry
					)
					renderQueueEntry.lastUpdated = Date.now()
				})
			}
		},

		dispatchNativeSliderPostUpdate(slider, cause, payload) {
			if (!this.events.nativeSliderPostUpdate.enabled) {
				return
			}
			slider.dispatchEvent(
				new CustomEvent(this.events.nativeSliderPostUpdate.handle, {
					detail: { slider, cause, payload, nativeSliderInstance: this }
				})
			)
		},

		dispatchNativeSliderRenderLoopPreUpdate() {
			if (!this.events.nativeSliderRenderLoopPreUpdate.enabled) {
				return
			}
			if (!document) {
				return
			}
			document.dispatchEvent(
				new CustomEvent(this.events.nativeSliderRenderLoopPreUpdate.handle, {
					detail: {
						renderQueue: this.renderQueue,
						nativeSliderInstance: this
					}
				})
			)
		},

		createNewRenderQueueEntry(el, commandHandle, commandData, interval) {
			return {
				el,
				interval,
				lastUpdated: Date.now(),
				command: {
					handle: commandHandle,
					data: commandData
				}
			}
		},

		initButtons(target = null) {
			if (target === null) {
				target = document
			}
			const nativeSliderButtons = target.getElementsByClassName(this.classList.button)
			if (nativeSliderButtons.length === 0) {
				return
			}

			for (const nativeSliderButton of nativeSliderButtons) {
				const slider = this.getSliderFromButton(nativeSliderButton)
				if (slider === null) {
					continue
				}
				const overFlowingDiff =
					Math.abs(slider.clientWidth - slider.scrollWidth) + this.deltaPadding
				const isSliderOverFlowing = overFlowingDiff > this.diffThreshold
				if (!('dataset' in nativeSliderButton)) {
					continue
				}
				const alwaysShow = (nativeSliderButton as HTMLElement).dataset.always_show === '1'
				if (!isSliderOverFlowing && !alwaysShow) {
					if (!('style' in nativeSliderButton)) {
						continue
					}
					;(nativeSliderButton as HTMLElement).style.display = 'none'
					continue
				}
				nativeSliderButton.removeEventListener(
					'click',
					this.listenerSliderSlideButtonClick.bind(this)
				)
				nativeSliderButton.addEventListener(
					'click',
					this.listenerSliderSlideButtonClick.bind(this),
					{ passive: true }
				)
			}
		},

		initSliders(target = null) {
			if (target === null) {
				target = document
			}
			const nativeSliders = target.getElementsByClassName(this.classList.listGroup)
			if (nativeSliders.length === 0) {
				return
			}

			for (const nativeSlider of nativeSliders) {
				if (!('dataset' in nativeSlider)) {
					continue
				}
				// Generate a new UUID for the slider element
				;(nativeSlider as HTMLElement).dataset.slider_uuid = uuidv4()
				if ('autoplay_interval' in (nativeSlider as HTMLElement).dataset) {
					const autoplayInterval = Number(
						(nativeSlider as HTMLElement).dataset.autoplay_interval
					)
					const renderQueueEntry = this.createNewRenderQueueEntry(
						nativeSlider,
						'slideNativeSliderCommand',
						{ direction: 1 },
						autoplayInterval
					)
					this.renderQueue?.add(renderQueueEntry as unknown as HTMLElement)
				}
				if ('drag_speed' in (nativeSlider as HTMLElement).dataset) {
					const computedSliderStyle = window.getComputedStyle(nativeSlider)
					const scrollMode = computedSliderStyle.scrollSnapType.startsWith('y')
						? 'y'
						: 'x'
					if (!this.dragDataLayer) {
						this.dragDataLayer = new Map()
					}
					this.dragDataLayer.set(nativeSlider, {
						isDown: false,
						startXY: 0,
						scrollLeftTop: 0,
						scrollMode
					})
					const eventMap = {
						mousedown: this.listenerSliderXYDragMousedown,
						mouseleave: this.listenerSliderXYDragMouseleave,
						mouseup: this.listenerSliderXYDragMouseup,
						mousemove: this.listenerSliderXYDragMousemove
					}
					for (const [event, listener] of Object.entries(eventMap)) {
						nativeSlider.removeEventListener(
							event,
							listener.bind(this, nativeSlider as HTMLElement)
						)
						nativeSlider.addEventListener(
							event,
							listener.bind(this, nativeSlider as HTMLElement)
						)
					}
				}
			}

			if (this.intersectionObserver) {
				for (const nativeSlider of nativeSliders) {
					const slides = nativeSlider.getElementsByClassName(this.classList.listItem)
					for (const slide of slides) {
						this.intersectionObserver.observe(slide)
					}
				}
			}
		},

		initRenderLoop() {
			this.renderLoopTimingBelt = null
			if (!document) {
				return
			}
			document.addEventListener('nativeSliderRenderLoopPreUpdate', (e) => {
				if (this.renderLoopTimingBelt !== null) {
					clearInterval(Number(this.renderLoopTimingBelt))
				}
				if (!('detail' in e)) {
					return
				}
				const detail = e.detail as { renderQueue: any }
				this.update(detail)
				this.renderLoopTimingBelt = setInterval(() => {
					this.dispatchNativeSliderRenderLoopPreUpdate()
				}, this.pollingInterval)
			})
			this.dispatchNativeSliderRenderLoopPreUpdate()
		},

		initSlidersWithButtons(target = null) {
			if (target === null) {
				target = document
			}
			this.initButtons(target)
			this.initSliders(target)
		},

		isInViewport(element: HTMLElement) {
			const rect = element.getBoundingClientRect()
			return (
				rect.top >= 0 &&
				rect.left >= 0 &&
				rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
				rect.right <= (window.innerWidth || document.documentElement.clientWidth)
			)
		},

		disconnectIntersectionObserver() {
			if (this.intersectionObserver) {
				this.intersectionObserver.disconnect()
			}
		},

		cleanupListeners(nativeSlider: HTMLElement) {
			const eventMap = {
				mousedown: this.listenerSliderXYDragMousedown,
				mouseleave: this.listenerSliderXYDragMouseleave,
				mouseup: this.listenerSliderXYDragMouseup,
				mousemove: this.listenerSliderXYDragMousemove
			}
			for (const [event, listener] of Object.entries(eventMap)) {
				nativeSlider.removeEventListener(
					event,
					listener.bind(this, nativeSlider as HTMLElement)
				)
			}
		},

		cleanupButtons(nativeSliderButton: HTMLElement) {
			nativeSliderButton.removeEventListener(
				'click',
				this.listenerSliderSlideButtonClick.bind(this)
			)
		},

		cleanUpNativeSlider() {
			if (this.renderQueue) {
				this.renderQueue.clear()
			}
			if (this.dragDataLayer) {
				this.dragDataLayer.clear()
			}
			this.disconnectIntersectionObserver()
			if (this.renderLoopTimingBelt !== null) {
				clearInterval(Number(this.renderLoopTimingBelt))
			}
			if (!document) {
				return
			}
			const nativeSliders = document.getElementsByClassName(this.classList.listGroup)
			if (nativeSliders.length === 0) {
				return
			}
			for (const nativeSlider of nativeSliders) {
				this.cleanupListeners(nativeSlider as HTMLElement)
			}
			const nativeSliderButtons = document.getElementsByClassName(this.classList.button)
			if (nativeSliderButtons.length === 0) {
				return
			}
			for (const nativeSliderButton of nativeSliderButtons) {
				this.cleanupButtons(nativeSliderButton as HTMLElement)
			}
		},

		init() {
			if (this.renderQueue === null) {
				this.renderQueue = new Set()
			}
			if (this.dragDataLayer === null) {
				this.dragDataLayer = new Map()
			}
			this.initSlidersWithButtons()
			this.initIntersectionObserver()
			this.initRenderLoop()
		}
	}

	return nativeSliderInstance
}
