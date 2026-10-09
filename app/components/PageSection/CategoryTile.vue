<script lang="ts" setup>
/**
 * One category in the categories band.
 *
 * The category's photograph on a square sunken tile, its name under
 * it. A single link, so the whole card is the target rather than the
 * words inside it, and the category's product count beside the name.
 */
defineProps<{
  category: CategoryMenuEntry
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <ULink
    :to="localePath(pathLocation(category.to))"
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
    <p class="flex items-baseline justify-between gap-2 px-0.5">
      <span class="font-bold text-highlighted">{{ category.label }}</span>
      <span class="shrink-0 font-mono text-xs text-muted">
        {{ category.productCount }}
        <span class="sr-only">{{ t('products', {}, category.productCount) }}</span>
      </span>
    </p>
  </ULink>
</template>

<i18n lang="yaml">
el:
  products: "προϊόν | προϊόντα"
en:
  products: "product | products"
</i18n>
