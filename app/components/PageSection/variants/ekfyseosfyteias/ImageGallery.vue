<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * Moments: square photographs with rounded corners, the caption (when
 * the operator wrote one) below. `columns` is the width a tile may not
 * shrink below, so the grid fills its row on a desk and stacks on a
 * phone without a breakpoint.
 */
const props = withDefaults(defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
  items?: Array<{ src: string, alt: string, caption?: string }>
  columns?: number
  surface?: 'default' | 'muted'
}>(), {
  columns: 3,
})

// Static class map so Tailwind sees every variant at build time.
const TRACK_CLASSES: Record<number, string> = {
  2: 'grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))]',
  3: 'grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))]',
  4: 'grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))]',
}

const trackClass = computed(() => TRACK_CLASSES[props.columns] ?? TRACK_CLASSES[3])
</script>

<template>
  <section
    v-if="items?.length"
    :class="surface === 'muted' ? 'bg-(--fy-raised)' : 'bg-(--fy-ground)'"
  >
    <div
      class="
        mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-6
        py-[clamp(64px,8vw,112px)]
      "
    >
      <h2
        v-if="title"
        class="
          font-display text-[length:clamp(36px,4vw,58px)] leading-[1.04]
          font-extrabold tracking-[-0.015em] text-balance text-(--fy-text)
        "
      >
        {{ title }}
      </h2>

      <ul
        class="grid gap-4"
        :class="trackClass"
      >
        <li
          v-for="(item, index) in items"
          :key="index"
        >
          <figure class="flex flex-col gap-2">
            <ImgWithFallback
              :src="item.src"
              :alt="item.alt"
              :width="600"
              :height="600"
              sizes="xs:100vw md:33vw lg:400px"
              class="block aspect-square w-full rounded-3xl object-cover"
              fit="cover"
              quality="80"
              densities="x1 x2"
              loading="lazy"
            />
            <figcaption
              v-if="item.caption"
              class="text-sm text-(--fy-text-muted)"
            >
              {{ item.caption }}
            </figcaption>
          </figure>
        </li>
      </ul>
    </div>
  </section>
</template>
