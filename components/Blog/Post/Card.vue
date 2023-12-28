<script lang="ts" setup>
import { isClient } from '@vueuse/shared'
import { useShare } from '@vueuse/core'
import type { PropType } from 'vue'
import type { ImageLoading } from '~/types/global/general'
import type { BlogPost } from '~/types/blog/post'

const props = defineProps({
	post: { type: Object as PropType<BlogPost>, required: true },
	imgWidth: { type: Number, required: false, default: 324 },
	imgHeight: { type: Number, required: false, default: 230 },
	showShareButton: { type: Boolean, required: false, default: true },
	imgLoading: {
		type: String as PropType<ImageLoading>,
		required: false,
		default: undefined,
		validator: (value: string) => ['lazy', 'eager'].includes(value)
	}
})

const { locale } = useI18n()
const { resolveImageSrc } = useImageResolver()
const { extractTranslated } = useTranslationExtractor()
const { contentShorten } = useText()

const { post } = toRefs(props)

const postUrl = computed(() => {
	if (!props.post) return ''
	return `/blog/post/${post.value.id}/${post.value.slug}`
})

const src = computed(() => {
	return resolveImageSrc(
		post.value?.mainImageFilename,
		`media/uploads/blog/${post.value?.mainImageFilename}`
	)
})

const alt = computed(() => {
	return extractTranslated(post.value, 'title', locale.value)
})

const shareOptions = ref({
	title: extractTranslated(post.value, 'title', locale.value),
	text: extractTranslated(post.value, 'subtitle', locale.value) || '',
	url: isClient ? postUrl : ''
})
const { share, isSupported } = useShare(shareOptions)
const startShare = () => share().catch((err) => err)
</script>

<template>
	<li
		class="w-full grid gap-4 container p-5 bg-white text-white dark:bg-zinc-800 dark:text-black rounded-lg"
	>
		<div class="mb-3 md:mb-6">
			<Anchor :to="`/blog/post${post.absoluteUrl}`" :text="alt">
				<NuxtImg
					:loading="imgLoading"
					provider="mediaStream"
					class="w-full h-auto bg-transparent object-cover"
					:style="{ objectFit: 'contain', contentVisibility: 'auto' }"
					:src="src"
					:width="imgWidth"
					:height="imgHeight"
					:fit="'contain'"
					:position="'entropy'"
					:background="'transparent'"
					:trim-threshold="5"
					sizes="`xs:405px sm:318px md:196px lg:196px xl:260px xxl:324px 2xl:324px`"
					:alt="alt"
					densities="x1"
				/>
			</Anchor>
		</div>
		<ClientOnly>
			<MainButton
				v-if="isSupported && showShareButton"
				:disabled="!isSupported"
				:text="
					isSupported
						? $t('components.blog.post.card.share')
						: $t('components.blog.post.card.share_not_supported')
				"
				size="xs"
				class="font-extrabold capitalize grid justify-self-start"
				@click="startShare"
			/>
			<template #fallback>
				<ClientOnlyFallback height="24px" width="64px" />
			</template>
		</ClientOnly>
		<div class="gap-4 md:grid md:gap-x-12 lg:gap-x-6">
			<div class="grid">
				<h3 class="grid h-20">
					<Anchor
						:to="`/blog/post${post.absoluteUrl}`"
						:text="alt"
						class="mb-4 text-2xl font-bold tracking-tight text-black dark:text-white md:text-4xl"
					>
						{{ extractTranslated(post, 'title', locale) }}
					</Anchor>
				</h3>
				<div class="grid">
					<span class="text-sm text-primary-700 dark:text-primary-100">
						{{ post.publishedAt }}
					</span>
				</div>
			</div>
			<div class="grid gap-2 md:gap-4">
				<div class="grid h-20">
					<p class="text-sm text-primary-700 dark:text-primary-100">
						{{ contentShorten(extractTranslated(post, 'subtitle', locale), 100) }}
					</p>
				</div>
				<div class="flex items-center justify-end">
					<div class="relative mr-4 h-12 w-12">
						<NuxtImg
							loading="lazy"
							provider="mediaStream"
							class="rounded-full"
							:style="{ objectFit: 'contain', contentVisibility: 'auto' }"
							:src="src"
							:width="90"
							:height="90"
							:fit="'contain'"
							:position="'entropy'"
							:background="'transparent'"
							:trim-threshold="5"
							sizes="`xs:405px sm:318px md:196px lg:196px xl:260px xxl:90px 2xl:90px`"
							:alt="alt"
							densities="x1"
						/>
					</div>
					<div v-if="typeof post.author !== 'number'" class="grid">
						<span
							v-if="typeof post.author.user !== 'number'"
							class="text-sm font-bold text-primary-700 dark:text-primary-100"
						>
							{{ post.author.user.firstName }} {{ post.author.user.lastName }}
						</span>
					</div>
				</div>
			</div>
		</div>
	</li>
</template>
