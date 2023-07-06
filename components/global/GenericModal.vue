<script lang="ts" setup>
import { GlobalEvents } from '~/events/global'

const props = defineProps({
	shouldModalStartInOpenState: {
		type: Boolean,
		required: false,
		default: false
	},
	uniqueId: {
		type: String,
		required: true
	},
	closeBtnColor: {
		type: String,
		required: false,
		default: '#9A9A9B'
	},
	closeBtnPosition: {
		type: String,
		required: false,
		default: 'out',
		validator: (value: string) => ['in', 'out'].includes(value)
	},
	hasHeader: {
		type: Boolean,
		required: false,
		default: true
	},
	hasFooter: {
		type: Boolean,
		required: false,
		default: true
	},
	openDispatchEvent: {
		type: String,
		required: false,
		default: 'modal-open'
	},
	closeDispatchEvent: {
		type: String,
		required: false,
		default: 'modal-close'
	},
	width: {
		type: String,
		required: false,
		default: '100%'
	},
	height: {
		type: String,
		required: false,
		default: '100%'
	},
	maxWidth: {
		type: String,
		required: false,
		default: '1190px'
	},
	maxHeight: {
		type: String,
		required: false,
		default: '680px'
	},
	overflow: {
		type: String,
		required: false,
		default: 'unset'
	},
	gap: {
		type: String,
		required: false,
		default: 'unset'
	},
	padding: {
		type: String,
		required: false,
		default: '1rem'
	},
	modalOpenTriggerHandlerId: {
		type: String,
		required: false,
		default: 'modal-open'
	},
	modalCloseTriggerHandlerId: {
		type: String,
		required: false,
		default: 'modal-close'
	},
	modalOpenedTriggerHandlerId: {
		type: String,
		required: false,
		default: 'modal-opened'
	},
	modalClosedTriggerHandlerId: {
		type: String,
		required: false,
		default: 'modal-closed'
	},
	exitModalIconClass: {
		type: String,
		required: false,
		default: 'lni lni-close'
	},
	position: {
		type: String,
		default: 'fixed'
	},
	backgroundBlur: {
		type: String,
		required: false,
		default: 'blur(1rem)'
	},
	borderRadius: {
		type: String,
		required: false,
		default: '10px'
	},
	border: {
		type: String,
		required: false,
		default: 'none'
	},
	isForm: {
		type: Boolean,
		required: false,
		default: false
	},
	formId: {
		type: String,
		required: false,
		default: ''
	},
	formName: {
		type: String,
		required: false,
		default: ''
	}
})

defineSlots<{
	header(props: {}): any
	body(props: {}): any
	footer(props: {}): any
}>()

const { t } = useLang()
const emit = defineEmits(['submitForm'])

const isModalCurrentlyOpen = ref(props.shouldModalStartInOpenState)
const getMyId = computed(() => `modal-${props.uniqueId}`)

const bus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)

const openModal = () => {
	isModalCurrentlyOpen.value = true
	bus.emit(props.modalOpenedTriggerHandlerId)
}

const closeModal = () => {
	isModalCurrentlyOpen.value = false
	bus.emit(props.modalClosedTriggerHandlerId)
}

bus.on((event: string) => {
	if (event === props.modalOpenTriggerHandlerId) {
		openModal()
	}
	if (event === props.modalCloseTriggerHandlerId) {
		closeModal()
	}
})

onMounted(() => {
	isModalCurrentlyOpen.value = props.shouldModalStartInOpenState
})
</script>

<template>
	<Teleport to="body">
		<div
			:class="`cp-utilities-generic_modal-wrapper ${
				isModalCurrentlyOpen ? 'open' : 'closed'
			}`"
		>
			<div
				class="cp-utilities-generic_modal-overlay"
				:style="`backdrop-filter:${backgroundBlur};`"
				@click="closeModal"
			>
				<svg
					class="cp-utilities-generic_modal-overlay-static"
					xmlns="http://www.w3.org/2000/svg"
				>
					<filter :id="getMyId">
						<feTurbulence
							type="fractalNoise"
							baseFrequency="0.68"
							numOctaves="1"
							stitchTiles="stitch"
						/>
					</filter>
					<rect width="100%" height="100%" :filter="`url(#${getMyId})`" />
				</svg>
			</div>
			<button
				v-if="closeBtnPosition === 'out'"
				:style="`color: ${closeBtnColor}`"
				class="cp-utilities-generic_modal-overlay-close"
				type="button"
				aria-label="Close"
				@click="closeModal"
			>
				<span class="hidden">{{ $t('components.global.generic_modal.close') }}</span>
				<IconEntypo:circleWithCross></IconEntypo:circleWithCross>
			</button>
			<template v-if="isForm">
				<form
					:id="formId"
					class="cp-utilities-generic_modal bg-white dark:bg-zinc-900"
					:name="formName"
					@submit="$emit('submitForm', $event)"
				>
					<div v-if="hasHeader" class="cp-utilities-generic_modal-header">
						<slot name="header" />
					</div>
					<div class="cp-utilities-generic_modal-body">
						<slot name="body" />
					</div>
					<div v-if="hasFooter" class="cp-utilities-generic_modal-footer">
						<slot name="footer" />
					</div>
					<button
						v-if="closeBtnPosition === 'in'"
						:style="`color: ${closeBtnColor}`"
						class="cp-utilities-generic_modal-overlay-close"
						type="button"
						aria-label="Close"
						@click="closeModal"
					>
						<span class="hidden">{{ $t('components.global.generic_modal.close') }}</span>
						<IconEntypo:circleWithCross></IconEntypo:circleWithCross>
					</button>
				</form>
			</template>
			<template v-else>
				<div class="cp-utilities-generic_modal bg-white dark:bg-zinc-900">
					<div v-if="hasHeader" class="cp-utilities-generic_modal-header">
						<slot name="header" />
					</div>
					<div class="cp-utilities-generic_modal-body">
						<slot name="body" />
					</div>
					<div v-if="hasFooter" class="cp-utilities-generic_modal-footer">
						<slot name="footer" />
					</div>
					<button
						v-if="closeBtnPosition === 'in'"
						:style="`color: ${closeBtnColor}`"
						class="cp-utilities-generic_modal-overlay-close"
						type="button"
						aria-label="Close"
						@click="closeModal"
					>
						<span class="hidden">{{ $t('components.global.generic_modal.close') }}</span>
						<IconEntypo:circleWithCross></IconEntypo:circleWithCross>
					</button>
				</div>
			</template>
		</div>
	</Teleport>
</template>

<style lang="scss" scoped>
$transitional-profile-1: all 0.2s ease-out;

.cp-utilities-generic_modal {
	visibility: hidden;
	content-visibility: hidden;
	z-index: 32;
	position: v-bind(position);
	width: v-bind(width);
	height: v-bind(height);
	max-height: v-bind(maxHeight);
	max-width: v-bind(maxWidth);
	overflow: v-bind(overflow);
	gap: v-bind(gap);
	padding: v-bind(padding);

	&-wrapper {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		transition: $transitional-profile-1;
		pointer-events: none;
		user-select: none;
		display: grid;
		align-items: center;
		align-content: center;
		justify-items: center;
		justify-content: center;
		z-index: 31;
		&.open {
			opacity: 1;
			pointer-events: auto;
			user-select: initial;

			.cp-utilities-generic_modal {
				visibility: visible;
				content-visibility: visible;
				display: grid;
				align-items: center;
				padding: 1rem;
				border: v-bind(border);
				border-radius: v-bind(borderRadius);
				@media screen and (max-width: 1200px) {
					max-height: unset;
				}
				@media screen and (max-width: 767px) {
					max-width: 100% !important;
					padding: 0;
				}
			}
		}
	}
	&-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 1;
		z-index: 30;
		transition: $transitional-profile-1;

		@media screen and (max-width: 767px) {
			width: 100svw;
			height: 100lvh;
		}

		&-static {
			width: 100%;
			height: 100%;
			opacity: 0.23;
		}

		&-close {
			border-radius: 20px;
			border: none;
			position: absolute;
			top: 1rem;
			right: 1rem;
			cursor: pointer;
			color: #ef1b1b;
			z-index: 33;
			transition: $transitional-profile-1;
			span {
				i {
					font-weight: 900;
				}
			}
			&:hover {
				transform: scale(1.5);
			}
			&:active {
				transform: scale(0.8);
			}
		}
	}
	&-body {
		display: grid;
		transition: all 0.5s ease;
	}
	&-header {
		position: relative;
	}
}
</style>
