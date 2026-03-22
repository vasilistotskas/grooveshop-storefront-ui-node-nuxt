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

const { t } = useI18n()
const config = useRuntimeConfig()
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
      name="i-mdi-instagram"
      :class="iconClass"
    />
    <span class="sr-only">{{ t('instagram') }}</span>
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
      name="i-ant-design-tik-tok-filled"
      :class="iconClass"
    />
    <span class="sr-only">{{ t('tiktok') }}</span>
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
      name="i-mdi-reddit"
      :class="iconClass"
    />
    <span class="sr-only">{{ t('reddit') }}</span>
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
      name="i-mdi-youtube"
      :class="iconClass"
    />
    <span class="sr-only">{{ t('youtube') }}</span>
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
      name="i-mdi-pinterest"
      :class="iconClass"
    />
    <span class="sr-only">{{ t('pinterest') }}</span>
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
      name="i-mdi-facebook"
      :class="iconClass"
    />
    <span class="sr-only">{{ t('facebook') }}</span>
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
      name="i-mdi-discord"
      :class="iconClass"
    />
    <span class="sr-only">{{ t('discord') }}</span>
  </UButton>
</template>
