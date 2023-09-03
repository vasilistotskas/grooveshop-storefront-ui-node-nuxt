<script lang="ts" setup>
// eslint-disable-next-line n/handle-callback-err
const errorLogger = (error: unknown) => {
	// console.error(error)
}
definePageMeta({
	layout: 'page'
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
					<a v-for="i in 3" :key="i" href="/">
						<NuxtImg
							loading="eager"
							provider="mediaStream"
							class="w-full h-full object-cover"
							:style="{ objectFit: 'contain' }"
							:src="'/assets/images/1920x640.png'"
							:width="1920"
							:height="640"
							:fit="'cover'"
							:position="'entropy'"
							:background="'transparent'"
							:trim-threshold="5"
							:format="'webp'"
							:alt="'Main Banner'"
							sizes="sm:100vw md:50vw lg:1920px"
						/>
					</a>
				</NativeSlider>

				<div
					class="usps container-small flex flex-wrap items-center justify-center gap-8 my-16 text-center brand lg:justify-between"
				>
					<NativeSlider
						:drag-speed="1"
						:left-button-scroll-left-by="-1"
						:right-button-scroll-left-by="1"
					>
						<NuxtImg
							v-for="i in 6"
							:key="i"
							loading="lazy"
							provider="mediaStream"
							class="w-full h-full object-cover"
							:style="{ objectFit: 'contain' }"
							:src="'/assets/images/80x40.png'"
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
					</NativeSlider>
				</div>
			</PageSection>
		</PageBody>
	</PageWrapper>
</template>
