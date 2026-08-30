<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

defineProps({
  text: {
    type: String,
    default: '',
  },
  to: {
    type: [String, Object] as PropType<RouteLocationNamedI18n>,
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
  <NuxtLinkLocale
    v-if="to"
    :to="to"
    class="w-full"
    :aria-label="text || undefined"
  >
    <slot>{{ text }}</slot>
  </NuxtLinkLocale>
  <ULink
    v-else
    v-bind="attrs"
    :aria-label="text || undefined"
    :href="href"
    :external="true"
  >
    <slot>{{ text }}</slot>
  </ULink>
</template>
