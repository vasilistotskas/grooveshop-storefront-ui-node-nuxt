<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonProps } from '#ui/types'

defineProps({
  buttonSize: {
    type: String as PropType<ButtonProps['size']>,
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
    color="secondary"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-mdi-instagram" :class="iconClass"
    />
    <span class="sr-only">{{ $i18n.t('instagram') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.tiktok"
    color="secondary"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-ant-design-tik-tok-filled" :class="iconClass"
    />
    <span class="sr-only">{{ $i18n.t('tiktok') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.reddit"
    color="secondary"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-mdi-reddit" :class="iconClass"
    />
    <span class="sr-only">{{ $i18n.t('reddit') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.youtube"
    color="secondary"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-mdi-youtube" :class="iconClass"
    />
    <span class="sr-only">{{ $i18n.t('youtube') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.pinterest"
    color="secondary"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-mdi-pinterest" :class="iconClass"
    />
    <span class="sr-only">{{ $i18n.t('pinterest') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.facebook"
    color="secondary"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-mdi-facebook" :class="iconClass"
    />
    <span class="sr-only">{{ $i18n.t('facebook') }}</span>
  </UButton>
  <UButton
    :external="true"
    :size="buttonSize"
    :to="config.public.socials.discord"
    color="secondary"
    target="_blank"
    variant="link"
  >
    <UIcon
      name="i-mdi-discord" :class="iconClass"
    />
    <span class="sr-only">{{ $i18n.t('discord') }}</span>
  </UButton>
</template>
