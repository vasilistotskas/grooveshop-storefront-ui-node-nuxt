<script lang="ts" setup>
/**
 * The row of reassurances a shop puts near the top or the end of a
 * page: how you pay, who delivers, and — for a store that answers
 * agents — that it is agent-readable.
 *
 * A STRIP, not a grid: one row that the eye reads in a line. On a desk
 * the row is centred; on a phone it scrolls sideways under the thumb
 * (with the snap points a swipe expects) instead of wrapping into
 * three uneven rows, which is how five badges laid out at 390px on
 * the demo store — 1, 2 and 2.
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
    :bleed="!marquee"
  >
    <UMarquee
      v-if="marquee"
      :ui="{ root: '[--gap:2rem]' }"
    >
      <component
        :is="badge.href ? 'ULink' : 'div'"
        v-for="badge in visible"
        :key="badge.label"
        :to="badge.href ? localePath(badge.href) : undefined"
        class="flex items-center gap-2 text-toned"
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
    </UMarquee>

    <!-- The band bleeds so the strip can scroll to the viewport's
         edges on a phone; the container's gutters come back as the
         list's own padding, and `scroll-px` keeps a snapped badge off
         the edge. -->
    <ul
      v-else
      class="
        flex snap-x snap-mandatory gap-x-8 overflow-x-auto px-4
        [scrollbar-width:none]
        sm:px-6
        lg:justify-center lg:px-8
      "
      style="scroll-padding-inline: 1rem"
    >
      <li
        v-for="badge in visible"
        :key="badge.label"
        class="shrink-0 snap-start"
      >
        <component
          :is="badge.href ? 'ULink' : 'div'"
          :to="badge.href ? localePath(badge.href) : undefined"
          class="flex items-center gap-2 text-toned"
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
          <span class="text-sm font-medium whitespace-nowrap">{{ badge.label }}</span>
        </component>
      </li>
    </ul>
  </PageSectionBand>
</template>
