<script lang="ts" setup>
definePageMeta({
	layout: 'default'
})
</script>

<template>
	<div class="relative">
		<PageBody>
			<PageSection>
				<NativeSlideShow>
					<a v-for="(i, index) in 3" :key="i" href="/" class="native-slider-li">
						<NuxtPicture
							:loading="index === 0 ? 'eager' : 'lazy'"
							provider="mediaStream"
							class="w-full h-full object-cover"
							:style="{ objectFit: 'contain' }"
							:src="'/assets/images/black.png'"
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
				</NativeSlideShow>
				<div
					class="usps container-sm flex flex-wrap items-center justify-center gap-8 my-16 text-center brand lg:justify-between"
				>
					<NativeSlideShow slider-class="auto-cols-1 md:auto-cols-2 lg:auto-cols-3">
						<a href="/" class="native-slider-li">
							<NuxtImg
								loading="eager"
								provider="mediaStream"
								class="w-full h-full object-cover"
								:style="{ objectFit: 'contain' }"
								:src="'/assets/images/black.png'"
								:width="80"
								:height="40"
								:fit="'cover'"
								:position="'entropy'"
								:background="'transparent'"
								:trim-threshold="5"
								:format="'webp'"
								:alt="'Usp'"
								sizes="sm:100vw md:50vw lg:80px"
							/>
						</a>
						<a href="/" class="native-slider-li">
							<NuxtImg
								loading="lazy"
								provider="mediaStream"
								class="w-full h-full object-cover"
								:style="{ objectFit: 'contain' }"
								:src="'/assets/images/white.png'"
								:width="80"
								:height="40"
								:fit="'cover'"
								:position="'entropy'"
								:background="'transparent'"
								:trim-threshold="5"
								:format="'webp'"
								:alt="'Usp'"
								sizes="sm:100vw md:50vw lg:80px"
							/>
						</a>
						<a href="/" class="native-slider-li">
							<NuxtImg
								loading="lazy"
								provider="mediaStream"
								class="w-full h-full object-cover"
								:style="{ objectFit: 'contain' }"
								:src="'/assets/images/black.png'"
								:width="80"
								:height="40"
								:fit="'cover'"
								:position="'entropy'"
								:background="'transparent'"
								:trim-threshold="5"
								:format="'webp'"
								:alt="'Usp'"
								sizes="sm:100vw md:50vw lg:80px"
							/>
						</a>
						<a href="/" class="native-slider-li">
							<NuxtImg
								loading="lazy"
								provider="mediaStream"
								class="w-full h-full object-cover"
								:style="{ objectFit: 'contain' }"
								:src="'/assets/images/white.png'"
								:width="80"
								:height="40"
								:fit="'cover'"
								:position="'entropy'"
								:background="'transparent'"
								:trim-threshold="5"
								:format="'webp'"
								:alt="'Usp'"
								sizes="sm:100vw md:50vw lg:80px"
							/>
						</a>
					</NativeSlideShow>
				</div>
			</PageSection>
		</PageBody>
	</div>
</template>
