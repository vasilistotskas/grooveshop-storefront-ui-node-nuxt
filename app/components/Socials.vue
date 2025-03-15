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
const { $i18n } = useNuxtApp()
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
    <UIcon
      name="i-mdi-instagram" :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $i18n.t('instagram') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.tiktok"
    color="opposite"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-ant-design-tik-tok-filled" :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $i18n.t('tiktok') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.reddit"
    color="opposite"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-mdi-reddit" :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $i18n.t('reddit') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.youtube"
    color="opposite"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-mdi-youtube" :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $i18n.t('youtube') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.pinterest"
    color="opposite"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-mdi-pinterest" :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $i18n.t('pinterest') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.facebook"
    color="opposite"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-mdi-facebook" :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $i18n.t('facebook') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.discord"
    color="opposite"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-mdi-discord" :class="iconClass"
      class="
        text-secondary-light

        dark:text-secondary-dark
      "
    />
    <span class="sr-only">{{ $i18n.t('discord') }}</span>
  </UButton>
</template>
