<script lang="ts" setup>
definePageMeta({
	layout: 'page'
})
</script>

<template>
	<PageWrapper>
		<PageBody>
			<PageSection>
				<NativeSlideShow>
					<a v-for="i in 3" :key="i" href="/">
						<NuxtPicture
							loading="eager"
							provider="mediaStream"
							placeholder
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
							sizes="100vw sm:50vw md:960px"
						/>
					</a>
				</NativeSlideShow>
				<div
					class="usps container-small flex flex-wrap items-center justify-center gap-8 my-16 text-center brand lg:justify-between"
				>
					<NativeSlideShow>
						<NuxtImg
							v-for="i in 6"
							:key="i"
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
					</NativeSlideShow>
				</div>
			</PageSection>
		</PageBody>
	</PageWrapper>
</template>
