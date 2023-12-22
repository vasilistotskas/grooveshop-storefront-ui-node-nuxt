<script lang="ts" setup>
import type { PropType } from 'vue'
import type { SearchProduct } from '~/types/search'

const props = defineProps({
	item: {
		type: Object as PropType<SearchProduct>,
		required: true
	}
})
const { locale } = useI18n()
const { item } = toRefs(props)
const { extractTranslated } = useTranslationExtractor()
const { resolveImageSrc } = useImageResolver()

const src = computed(() => {
	return resolveImageSrc(
		item.value?.mainImageFilename,
		`media/uploads/products/${item.value?.mainImageFilename}`
	)
})

const alt = computed(() => {
	return extractTranslated(item.value, 'name', locale.value)
})
</script>

<template>
	<UCard class="bg-zinc-100 dark:bg-zinc-900">
		<Anchor
			:to="`/product${item.absoluteUrl}`"
			class="pb-2"
			:text="extractTranslated(item, 'name', locale)"
		>
			<div class="block bg-zinc4:10 p-1 transition duration-400 hover:scale-105 z-10">
				<NuxtImg
					v-if="src"
					loading="lazy"
					provider="mediaStream"
					class="w-full h-full object-cover aspect-square"
					:style="{ 'view-transition-name': `item-${item.id}`, aspectRatio: '1/1' }"
					:width="300"
					:height="300"
					:fit="'contain'"
					:position="'entropy'"
					:background="'ffffff'"
					:trim-threshold="5"
					:sizes="`xs:532px sm:520px md:288px lg:253px xl:236px xxl:300px 2xl:300px`"
					:src="src"
					:alt="alt"
					densities="x1"
				/>
				<div v-else class="h-full op10 flex">
					<div class="text-4xl">
						<IconFa6Solid:circleQuestion />
					</div>
				</div>
			</div>
			<div class="mt-2">
				{{ extractTranslated(item, 'name', locale) }}
			</div>
		</Anchor>
	</UCard>
</template>
