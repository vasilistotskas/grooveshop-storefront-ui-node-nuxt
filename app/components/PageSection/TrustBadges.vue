<script lang="ts" setup>
/**
 * The row of reassurances a shop puts near the end of a page: how you
 * pay, who delivers, and — for a store that answers agents — that it is
 * agent-readable.
 *
 * `kind: 'ai'` is gated on the tenant's agent-commerce flag rather than
 * on the operator's word, so a store cannot advertise a surface it does
 * not serve.
 */
const props = defineProps<{
  title?: string
  heading?: string
  items?: Array<{
    kind: 'payment' | 'shipping' | 'ai' | 'custom'
    label: string
    imageUrl?: string
    icon?: string
    href?: string
  }>
  marquee?: boolean
  surface?: 'default' | 'muted'
}>()

const localePath = useLocalePath()
const tenantStore = useTenantStore()

const visible = computed(() =>
  (props.items ?? []).filter(
    item => item.kind !== 'ai' || tenantStore.agentCommerceEnabled,
  ),
)
</script>

<template>
  <PageSectionBand
    v-if="visible.length"
    :heading="heading || title"
    :surface="surface"
    padding="sm"
  >
    <component
      :is="marquee ? 'UMarquee' : 'div'"
      :class="marquee ? undefined : 'flex flex-wrap items-center justify-center gap-x-8 gap-y-5'"
      :ui="marquee ? { root: '[--gap:2rem]' } : undefined"
      :overlay="marquee ? false : undefined"
    >
      <component
        :is="badge.href ? 'ULink' : 'div'"
        v-for="badge in visible"
        :key="badge.label"
        :to="badge.href ? localePath(badge.href) : undefined"
        class="flex items-center gap-2 text-muted"
      >
        <ImgWithFallback
          v-if="badge.imageUrl"
          :src="badge.imageUrl"
          :alt="badge.label"
          :width="72"
          :height="28"
          fit="contain"
          loading="lazy"
          densities="x1"
          class="h-7 w-auto object-contain"
        />
        <UIcon
          v-else-if="badge.icon"
          :name="badge.icon"
          class="size-6"
        />
        <span class="text-sm font-medium">{{ badge.label }}</span>
      </component>
    </component>
  </PageSectionBand>
</template>
