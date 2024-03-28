<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})

const mainSliderItems = [
  { src: '/img/white.png', loading: 'eager' },
  { src: '/img/black.jpg', loading: 'lazy' },
  { src: '/img/white.png', loading: 'lazy' },
]

const secondarySliderItems = [
  { src: '/img/white.png', loading: 'eager' },
  { src: '/img/black.jpg', loading: 'lazy' },
  { src: '/img/white.png', loading: 'lazy' },
  { src: '/img/black.jpg', loading: 'lazy' },
]
</script>

<template>
  <div class="container-fluid relative !p-0">
    <PageBody>
      <PageSection>
        <UCarousel
          v-slot="{ item }"
          :items="mainSliderItems"
          class="overflow-hidden rounded-lg"
          :ui="{
            indicators: {
              inactive: 'mix-blend-difference',
            },
          }"
          arrows
          indicators
        >
          <a href="/">
            <ImgWithFallback
              provider="mediaStream"
              class="h-full w-full"
              :style="{ objectFit: 'contain' }"
              :src="item.src"
              :width="1920"
              :height="640"
              :fit="'cover'"
              :position="'entropy'"
              :background="'transparent'"
              :trim-threshold="5"
              :format="'webp'"
              :alt="'Main Banner'"
              sizes="sm:100vw md:100vw lg:100vw xl:100vw xxl:100vw 2xl:100vw"
              densities="x1"
              :loading="item.loading"
            />
          </a>
        </UCarousel>
        <div
          class="usps container-sm brand my-16 flex flex-wrap items-center justify-center gap-8 text-center lg:justify-between"
        >
          <UCarousel
            v-slot="{ item }"
            :items="secondarySliderItems"
            :ui="{
              item: 'basis-full',
              indicators: {
                inactive: 'mix-blend-difference',
              },
            }"
            class="overflow-hidden rounded-lg"
            arrows
            indicators
          >
            <a href="/">
              <ImgWithFallback
                :loading="item.loading"
                provider="mediaStream"
                class="bg-white"
                :style="{ objectFit: 'contain' }"
                :src="item.src"
                :width="1290"
                :height="645"
                :fit="'cover'"
                :position="'entropy'"
                :background="'transparent'"
                :trim-threshold="5"
                :format="'webp'"
                :alt="'Usp'"
                sizes="`xs:307px sm:510px md:690px lg:930px xl:1290px xxl:1290px 2xl:1290px`"
                densities="x1"
              />
            </a>
          </UCarousel>
        </div>
      </PageSection>
    </PageBody>
  </div>
</template>
