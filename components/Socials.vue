<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonSize } from '#ui/types'

defineProps({
  buttonSize: {
    type: String as PropType<ButtonSize>,
    default: 'md',
  },
  iconClass: {
    type: String,
    default: 'text-3xl',
  },
})

const config = useRuntimeConfig()
</script>

<template>
  <UButton
    :to="config.public.socials.instagram"
    variant="link"
    color="opposite"
    :size="buttonSize"
  >
    <IconMdi:instagram
      :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $t('common.instagram') }}</span>
  </UButton>
  <UButton
    :to="config.public.socials.tiktok"
    variant="link"
    color="opposite"
    :size="buttonSize"
  >
    <IconAntDesign:tikTokFilled
      :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $t('common.tiktok') }}</span>
  </UButton>
  <UButton
    :to="config.public.socials.reddit"
    variant="link"
    color="opposite"
    :size="buttonSize"
  >
    <IconMdi:reddit
      :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $t('common.reddit') }}</span>
  </UButton>
  <UButton
    :to="config.public.socials.youtube"
    variant="link"
    color="opposite"
    :size="buttonSize"
  >
    <IconMdi:youtube
      :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $t('common.youtube') }}</span>
  </UButton>
  <UButton
    :to="config.public.socials.pinterest"
    variant="link"
    color="opposite"
    :size="buttonSize"
  >
    <IconMdi:pinterest
      :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $t('common.pinterest') }}</span>
  </UButton>
  <UButton
    :to="config.public.socials.facebook"
    variant="link"
    color="opposite"
    :size="buttonSize"
  >
    <IconMdi:facebook
      :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $t('common.facebook') }}</span>
  </UButton>
</template>
