<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Account } from '~/types/user/account'

const props = defineProps({
	userAccount: {
		type: Object as PropType<Account>,
		required: true
	},
	showName: {
		type: Boolean,
		required: false,
		default: true
	},
	imgWidth: {
		type: [Number, String],
		required: false,
		default: 100
	},
	imgHeight: {
		type: [Number, String],
		required: false,
		default: 100
	},
	backgroundBorder: {
		type: Boolean,
		required: false,
		default: false
	},
	changeAvatar: {
		type: Boolean,
		required: false,
		default: false
	}
})

const userStore = useUserStore()
const { updateAccountImage } = userStore

const { t } = useI18n()
const toast = useToast()
const { resolveImageSrc } = useImageResolver()

const src = computed(() => {
	return resolveImageSrc(
		props.userAccount?.mainImageFilename,
		`media/uploads/users/${props.userAccount?.mainImageFilename}`
	)
})

const alt = computed(() => {
	return props.userAccount?.firstName + ' ' + props.userAccount?.lastName
})

const uploadImage = async (event: Event) => {
	const allowedExtensions = ['jpg', 'jpeg', 'png']
	const target = event.target as HTMLInputElement
	const file = target.files?.[0]
	const fileExtensionAllowed = allowedExtensions.includes(
		file?.name.split('.').pop()?.toLowerCase() || ''
	)
	if (!file)
		return toast.add({
			title: t('components.user.avatar.no_file_selected')
		})
	if (!fileExtensionAllowed)
		return toast.add({
			title: t('components.user.avatar.file_extension_not_allowed')
		})
	const formData = new FormData()
	formData.append('image', file)
	if (!props.userAccount) return
	await updateAccountImage(props.userAccount.id, formData)
	toast.add({
		title: t('components.user.avatar.image.updated')
	})
}
</script>

<template>
	<div class="flex flex-col items-center" :class="[showName ? 'gap-2' : 'gap-0']">
		<div
			class="user-avatar relative grid items-center justify-center justify-items-center"
			:class="{
				'inline-block relative shrink-0 w-[135px] h-[135px] text-center align-middle':
					backgroundBorder
			}"
			:style="{
				width: typeof imgWidth === 'number' ? imgWidth + 'px' : imgWidth,
				height: typeof imgHeight === 'number' ? imgHeight + 'px' : imgHeight
			}"
		>
			<NuxtImg
				loading="lazy"
				provider="mediaStream"
				class="rounded-full"
				:style="{ objectFit: 'contain' }"
				:width="imgWidth"
				:height="imgHeight"
				:fit="'contain'"
				:position="'entropy'"
				:background="'transparent'"
				:trim-threshold="5"
				:sizes="`xs:${imgWidth}px sm:${imgWidth}px md:${imgWidth}px lg:${imgWidth}px xl:${imgWidth}px xxl:${imgWidth}px 2xl:${imgWidth}px`"
				:src="src"
				:alt="alt"
				densities="x1"
			/>

			<form
				v-if="changeAvatar"
				enctype="multipart/form-data"
				class="user-avatar-change absolute inset-0 z-10"
				name="uploadImageForm"
				:title="$t('components.user.avatar.change')"
			>
				<label for="image"
					><svg
						id="camera"
						class="hide-small-viewport hide-medium-viewport"
						xmlns="http://www.w3.org/2000/svg"
						x="0px"
						y="0px"
						viewBox="0 0 25 15"
						xml:space="preserve"
					>
						<path
							id="cameraFrame"
							fill="none"
							stroke="white"
							stroke-miterlimit="10"
							d="M23.1,14.1H1.9c-0.6,0-1-0.4-1-1V1.9c0-0.6,0.4-1,1-1h21.2
           c0.6,0,1,0.4,1,1v11.3C24.1,13.7,23.7,14.1,23.1,14.1z"
						></path>
						<path
							id="circle"
							fill="none"
							stroke="#ffffff"
							stroke-width="1.4"
							stroke-miterlimit="12"
							d="M17.7,7.5c0-2.8-2.3-5.2-5.2-5.2S7.3,4.7,7.3,7.5s2.3,5.2,5.2,5.2
           S17.7,10.3,17.7,7.5z"
						></path>
						<g id="plus">
							<path
								id="plusLine"
								fill="none"
								class="line"
								stroke="#ffffff"
								stroke-miterlimit="10"
								d="M20.9,2.3v4.4"
							></path>
							<path
								fill="none"
								class="line"
								stroke="#ffffff"
								stroke-miterlimit="10"
								d="M18.7,4.6h4.4"
							></path>
						</g></svg
				></label>
				<input
					id="image"
					type="file"
					name="image"
					placeholder="image"
					accept="image/*"
					class="hidden"
					@change="uploadImage"
				/>
			</form>
		</div>
		<div v-if="showName" class="flex flex-col">
			<span class="text-primary-700 dark:text-primary-100 font-bold">
				{{ userAccount?.firstName }}
			</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.user-avatar-change {
	svg {
		display: none;
		position: absolute;
		top: 18px;
		left: 1px;
		transform: scale(0.4);
		cursor: pointer;

		@media screen and (min-width: 768px) {
			display: block;
			top: 21px;
			transform: scale(0.5);
			transition: all 0.5s linear;
			stroke-dashoffset: 75px;
			stroke-dasharray: 75px;
		}
	}

	&:hover {
		background-color: transparent;
	}

	.user-avatar:hover & svg {
		stroke-dashoffset: 0;
	}
}
</style>
