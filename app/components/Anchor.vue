<script lang="ts" setup>
// eslint-disable-next-line
import type { RouteNamedMapI18n } from 'vue-router/auto-routes'
// eslint-disable-next-line
import type { RouteLocationAsRelativeI18n } from 'vue-router'

defineProps({
  text: {
    type: String,
    default: '',
  },
  to: {
    type: [String, Object] as PropType<keyof RouteNamedMapI18n | (Omit<RouteLocationAsRelativeI18n, 'path'> & { path?: string | undefined })>,
    default: undefined,
  },
  href: {
    type: String,
    default: '',
  },
})

const attrs = useAttrs()

defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <UButton
    v-if="to"
    v-bind="attrs"
    variant="link"
    :label="text"
  >
    <NuxtLinkLocale
      :to="to"
      class="w-full truncate"
      :aria-label="text"
      :prefetch="false"
    >
      <slot>{{ text }}</slot>
    </NuxtLinkLocale>
  </UButton>
  <ULink
    v-else
    v-bind="attrs"
    :aria-label="text"
    :href="href"
    :external="true"
    :prefetch="false"
  >
    <slot>{{ text }}</slot>
  </ULink>
</template>
