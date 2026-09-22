<script lang="ts" setup>
/**
 * One category in the categories band.
 *
 * Two shapes from one component: a `tile` leads with the category's own
 * image, and the compact form is a labelled disc for a rail or a dense
 * grid. Both are a single link, so the whole card is the target rather
 * than the words inside it.
 */
defineProps<{
  category: CategoryMenuEntry
  tile?: boolean
}>()

const localePath = useLocalePath()
</script>

<template>
  <ULink
    :to="localePath(category.to)"
    class="group flex h-full flex-col gap-2"
  >
    <div
      :class="[
        'overflow-hidden rounded-lg bg-elevated ring ring-default transition',
        'group-hover:ring-accented',
        tile ? 'aspect-[4/3]' : 'aspect-square',
      ]"
    >
      <ImgWithFallback
        :src="category.imagePath"
        :alt="category.label"
        :width="tile ? 320 : 200"
        :height="tile ? 240 : 200"
        fit="cover"
        loading="lazy"
        densities="x1"
        sizes="xs:50vw sm:33vw lg:25vw"
        class="
          size-full object-cover transition-transform duration-300
          group-hover:scale-105
        "
      />
    </div>

    <!-- The name is the tile's whole point — the photograph only says
         what kind of thing — so it is set at the band's body size. No
         arrow: the ring and the zoom already say the tile is a link,
         and on a two-line name the arrow wrapped onto a line of its
         own. -->
    <p class="text-base font-medium text-highlighted">
      {{ category.label }}
    </p>
  </ULink>
</template>
