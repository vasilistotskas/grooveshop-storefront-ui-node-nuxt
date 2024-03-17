<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})

const mainSliderItems = ['/img/black.png', '/img/black.png', '/img/black.png']

const secondarySliderItems = [
  '/img/black.png',
  '/img/white.png',
  '/img/black.png',
  '/img/white.png',
]
</script>

<template>
  <div class="container-fluid relative !p-0">
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
              class="h-full w-full"
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
                class="h-full w-full bg-white"
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
