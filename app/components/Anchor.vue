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

const attrs = useAttrs()
const localePath = useLocalePath()

defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <NuxtLink
    v-if="to"
    v-bind="attrs"
    tag="a"
    :to="localePath(to)"
    :aria-label="text"
    :class="cssClass"
    :prefetch="false"
  >
    <slot>{{ text }}</slot>
  </NuxtLink>
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

<style lang="scss" scoped>
a {
  &.disabled {
    pointer-events: none;
    cursor: default;
    color: #ccc;
  }
}
</style>
