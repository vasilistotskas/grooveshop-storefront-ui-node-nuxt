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
  cssClass: {
    type: [String, Object],
    default: '',
  },
})

const attrs = useAttrs()

defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <NuxtLinkLocale
    v-if="to"
    v-bind="attrs"
    tag="a"
    :to="to"
    :aria-label="text"
    :class="cssClass"
    :prefetch="false"
  >
    <slot>{{ text }}</slot>
  </NuxtLinkLocale>
  <ULink
    v-else
    v-bind="attrs"
    :aria-label="text"
    :active-class="[cssClass].join(' ')"
    :inactive-class="[cssClass].join(' ')"
    :href="href"
    :external="true"
    :prefetch="false"
  >
    <slot>{{ text }}</slot>
  </ULink>
</template>
