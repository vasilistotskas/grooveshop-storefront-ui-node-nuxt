<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  rate: {
    type: Number as PropType<number>,
    required: false,
    default: 0,
  },
})

const starSvg
  = '<path fill="currentColor" d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z" class=""></path>'
const starHalfSvg
  = '<path fill="currentColor" d="M288 0c-11.4 0-22.8 5.9-28.7 17.8L194 150.2 47.9 171.4c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.1 23 46 46.4 33.7L288 439.6V0z" class=""></path>'

const maxRate = 10

const backgroundStars = (productRate: number): string[] => {
  const stars = []
  const fullStars = Math.floor(productRate / 2)
  const hasHalfStar = productRate % 2 !== 0

  for (let i = 0; i < fullStars; i++) {
    stars.push(starSvg)
  }

  if (hasHalfStar) {
    stars.push(starHalfSvg)
  }

  const remainingStars = 5 - stars.length
  for (let i = 0; i < remainingStars; i++) {
    stars.push('')
  }

  return stars
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex max-w-[130px]">
      <svg
        v-for="(star, i) of backgroundStars(rate)"
        :key="i"
        aria-hidden="true"
        class="star size-5 text-[#f68b24]"
        data-icon="star"
        data-prefix="fas"
        focusable="false"
        role="img"
        viewBox="0 0 576 512"
        xmlns="http://www.w3.org/2000/svg"
        v-html="star"
      />
    </div>
    <div class="flex">
      <span class="text-sm">({{ rate }}/{{ maxRate }})</span>
    </div>
  </div>
</template>
