<script lang="ts" setup>
// composable
const { t } = useLang()
// meta
definePageMeta({
	layout: 'page'
})
useHead(() => ({
	title: t('pages.index.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.index.description')
		},
		{
			name: 'keywords',
			content: t('pages.index.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.index.title'),
	description: t('pages.index.description')
})
</script>

<template>
	<PageWrapper>
		<PageBody>
			<PageSection>
				<NativeSlider
					:drag-speed="1"
					:left-button-scroll-left-by="-1"
					:right-button-scroll-left-by="1"
				>
					<a href="/">
						<NuxtImg
							provider="mediaStream"
							:modifiers="{ w: 1920, h: 640, format: 'webp' }"
							alt="Main Banner"
							class="w-full h-full object-cover"
							format="webp"
							height="640"
							src="/nuxt/images/dummy/1920x640.png"
							width="1920"
						/>
					</a>
					<a href="/">
						<NuxtImg
							provider="mediaStream"
							:modifiers="{ w: 1920, h: 640, format: 'webp' }"
							alt="Main Banner"
							class="w-full h-full object-cover"
							format="webp"
							height="640"
							src="/nuxt/images/dummy/1920x640.png"
							width="1920"
						/>
					</a>
					<a href="/">
						<NuxtImg
							provider="mediaStream"
							:modifiers="{ w: 1920, h: 640, format: 'webp' }"
							alt="Main Banner"
							class="w-full h-full object-cover"
							format="webp"
							height="640"
							src="/nuxt/images/dummy/1920x640.png"
							width="1920"
						/>
					</a>
				</NativeSlider>

				<div
					class="usps container-small flex flex-wrap items-center justify-center gap-8 my-16 text-center brand lg:justify-between"
				>
					<NuxtImg
						v-for="i in 6"
						:key="i"
						provider="mediaStream"
						:modifiers="{ w: 80, h: 40, format: 'webp' }"
						alt="Usp"
						class="w-auto h-auto object-cover"
						format="webp"
						height="40"
						src="/nuxt/images/dummy/80x40.png"
						width="80"
					/>
				</div>
			</PageSection>
		</PageBody>
	</PageWrapper>
</template>

<style lang="scss"></style>
