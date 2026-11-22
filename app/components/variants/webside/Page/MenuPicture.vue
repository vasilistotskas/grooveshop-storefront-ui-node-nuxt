<script lang="ts" setup>
/**
 * A category's picture in the header's panels and the phone menu, drawn
 * by what it is. A category's `icon` (a blog topic's) is drawn on the
 * secondary fill the blog's category rail draws its icons on, in the
 * fill's own foreground, so it reads in light and dark. Without one, a
 * photograph fills its tile, cropped (`cover`), and an SVG is an icon:
 * cropping it cut the glyphs (Font Awesome's are not square), and a white
 * glyph on the light tile was nearly invisible, so it is drawn whole
 * (`contain`), inset, on that same fill.
 *
 * The tile's size is the caller's class (`size-24`); `size` is the same
 * box in pixels, for the image request.
 */
const props = defineProps<{
  src: string
  /** One of the page builder's icons, drawn instead of the picture. */
  icon?: string
  /** The tile's side in CSS pixels. */
  size: number
}>()

/** The glyph's share of the tile: `size-3/5` below. */
const GLYPH_SHARE = 3 / 5

const isIcon = computed(() => isSvgImage(props.src))
const glyphSize = computed(() => Math.round(props.size * GLYPH_SHARE))
</script>

<template>
  <span
    v-if="icon"
    class="grid shrink-0 place-items-center rounded-lg bg-secondary"
  >
    <UIcon
      :name="icon"
      class="size-3/5 text-(--ui-on-secondary)"
    />
  </span>
  <span
    v-else-if="isIcon"
    class="grid shrink-0 place-items-center rounded-lg bg-secondary"
  >
    <ImgWithFallback
      :src="src"
      alt=""
      :width="glyphSize"
      :height="glyphSize"
      fit="contain"
      background="transparent"
      loading="lazy"
      densities="x1 x2"
      class="size-3/5 object-contain"
    />
  </span>
  <ImgWithFallback
    v-else
    :src="src"
    alt=""
    :width="size"
    :height="size"
    fit="cover"
    loading="lazy"
    densities="x1 x2"
    class="shrink-0 rounded-lg bg-elevated object-cover"
  />
</template>
