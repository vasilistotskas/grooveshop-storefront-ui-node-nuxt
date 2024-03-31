<script lang="ts" setup>
import type { NuxtLinkProps } from '#app'

defineProps({
  text: {
    type: String,
    default: '',
  },
  to: {
    type: [String, Object] as PropType<NuxtLinkProps['to']>,
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
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <NuxtLinkLocale
    v-if="to"
    tag="a"
    :to="to"
    :aria-label="text"
    :class="cssClass"
  >
    <slot>{{ text }}</slot>
  </NuxtLinkLocale>
  <ULink
    v-else
    :aria-label="text"
    :active-class="[cssClass].join(' ')"
    :inactive-class="[cssClass].join(' ')"
    :to="href"
  >
    <slot>{{ text }}</slot>
  </ULink>
</template>

<style lang="scss" scoped>
a {
  &.disabled {
    pointer-events: none;
    cursor: default;
    color: #ccc;
  }
}
</style>
