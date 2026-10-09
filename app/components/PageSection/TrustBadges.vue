<script lang="ts" setup>
/**
 * The row of reassurances a shop puts near the top or the end of a
 * page: how you pay, who delivers, and — for a store that answers
 * agents — that it is agent-readable.
 *
 * A STRIP, not a grid: one row that the eye reads in a line. On a desk
 * it is one white bar with the reassurances spread across it; on a
 * phone each is a pill, and the row scrolls sideways under the thumb
 * (with the snap points a swipe expects) instead of wrapping into
 * three uneven rows, which is how five badges laid out at 390px on
 * the demo store — 1, 2 and 2. It sits close under the hero, so it
 * carries only a top margin.
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
    padding="none"
    class="
      pt-2
      lg:pt-6
    "
  >
    <UMarquee
      v-if="marquee"
      :ui="{ root: '[--gap:2rem]' }"
    >
      <component
        :is="badge.href ? 'ULink' : 'div'"
        v-for="badge in visible"
        :key="badge.label"
        :to="badge.href ? localePath(pathLocation(badge.href)) : undefined"
        class="flex items-center gap-2.5 text-sm font-semibold text-highlighted"
      >
        <ImgWithFallback
          v-if="badge.imageUrl"
          :src="badge.imageUrl"
          :alt="badge.label"
          :width="72"
          :height="24"
          fit="contain"
          loading="lazy"
          densities="x1 x2"
          class="h-6 w-auto object-contain"
        />
        <UIcon
          v-else-if="badge.icon"
          :name="badge.icon"
          class="size-4"
        />
        <span>{{ badge.label }}</span>
      </component>
    </UMarquee>

    <!-- On a phone the row runs to the viewport's edges, so it can
         scroll there: it takes the container's gutters back as its own
         padding, and the scroll padding keeps a snapped pill off the
         edge. On a desk it is the white bar itself. -->
    <ul
      v-else
      class="
        -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4
        [scrollbar-width:none]
        sm:-mx-6 sm:px-6
        lg:mx-0 lg:justify-between lg:gap-4 lg:overflow-visible
        lg:rounded-[1.25rem] lg:border lg:border-default lg:bg-default lg:px-7
        lg:py-4.5
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
          :to="badge.href ? localePath(pathLocation(badge.href)) : undefined"
          class="
            flex h-10 items-center gap-2.5 rounded-full border border-default
            bg-default px-3.5 text-sm font-semibold text-highlighted
            lg:h-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0
          "
        >
          <ImgWithFallback
            v-if="badge.imageUrl"
            :src="badge.imageUrl"
            :alt="badge.label"
            :width="72"
            :height="24"
            fit="contain"
            loading="lazy"
            densities="x1 x2"
            class="h-6 w-auto object-contain"
          />
          <UIcon
            v-else-if="badge.icon"
            :name="badge.icon"
            class="size-4 shrink-0"
          />
          <span class="whitespace-nowrap">{{ badge.label }}</span>
        </component>
      </li>
    </ul>
  </PageSectionBand>
</template>
