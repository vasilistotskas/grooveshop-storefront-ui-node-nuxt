<script lang="ts" setup>
definePageMeta({
	layout: 'default'
})

const mainSliderItems = [
	'/assets/images/black.png',
	'/assets/images/black.png',
	'/assets/images/black.png'
]

const secondarySliderItems = [
	'/assets/images/black.png',
	'/assets/images/white.png',
	'/assets/images/black.png',
	'/assets/images/white.png'
]
</script>

<template>
	<div class="relative">
		<PageBody>
			<PageSection>
				<UCarousel
					v-slot="{ item }"
					:items="mainSliderItems"
					:ui="{ item: 'basis-full' }"
					class="overflow-hidden rounded-lg"
					arrows
				>
					<a href="/">
						<NuxtPicture
							provider="mediaStream"
							class="h-full w-full object-cover"
							:style="{ objectFit: 'contain' }"
							:src="item"
							:width="1920"
							:height="640"
							:fit="'cover'"
							:position="'entropy'"
							:background="'transparent'"
							:trim-threshold="5"
							:format="'webp'"
							:alt="'Main Banner'"
						/>
					</a>
				</UCarousel>
				<div
					class="usps container-sm brand my-16 flex flex-wrap items-center justify-center gap-8 text-center lg:justify-between"
				>
					<UCarousel
						v-slot="{ item }"
						:items="secondarySliderItems"
						:ui="{ item: 'basis-full' }"
						class="overflow-hidden rounded-lg"
						arrows
					>
						<a href="/">
							<ImgWithFallback
								loading="eager"
								provider="mediaStream"
								class="h-full w-full bg-white object-cover"
								:style="{ objectFit: 'contain' }"
								:src="item"
								:width="1290"
								:height="645"
								:fit="'cover'"
								:position="'entropy'"
								:background="'transparent'"
								:trim-threshold="5"
								:format="'webp'"
								:alt="'Usp'"
								sizes="sm:100vw md:50vw lg:1290px"
							/>
						</a>
					</UCarousel>
				</div>
			</PageSection>
		</PageBody>
	</div>
</template>
