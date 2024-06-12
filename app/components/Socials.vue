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
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.instagram"
    color="opposite"
    target="_blank"
    variant="link"
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
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.tiktok"
    color="opposite"
    target="_blank"
    variant="link"
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
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.reddit"
    color="opposite"
    target="_blank"
    variant="link"
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
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.youtube"
    color="opposite"
    target="_blank"
    variant="link"
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
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.pinterest"
    color="opposite"
    target="_blank"
    variant="link"
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
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.facebook"
    color="opposite"
    target="_blank"
    variant="link"
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
