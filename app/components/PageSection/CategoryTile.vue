<script lang="ts" setup>
/**
 * One category in the categories band.
 *
 * The category's photograph on a square sunken tile, its name under
 * it. A single link, so the whole card is the target rather than the
 * words inside it. (The design also prints the category's product
 * count; the category list carries none yet — PLAN F8.)
 */
defineProps<{
  category: CategoryMenuEntry
}>()

const localePath = useLocalePath()
</script>

<template>
  <ULink
    :to="localePath(category.to)"
    class="group flex h-full flex-col gap-3"
  >
    <div class="aspect-square overflow-hidden rounded-[0.875rem] bg-elevated">
      <ImgWithFallback
        :src="category.imagePath"
        :alt="category.label"
        :width="380"
        :height="380"
        fit="cover"
        loading="lazy"
        densities="x1 x2"
        sizes="xs:50vw sm:33vw lg:17vw xl:190px"
        class="
          size-full object-cover transition-transform duration-300
          group-hover:scale-[1.03]
        "
      />
    </div>

    <!-- The name is the tile's whole point — the photograph only says
         what kind of thing. No arrow: the zoom already says the tile is
         a link, and on a two-line name an arrow wraps onto a line of
         its own. -->
    <p class="px-0.5 font-bold text-highlighted">
      {{ category.label }}
    </p>
  </ULink>
</template>
