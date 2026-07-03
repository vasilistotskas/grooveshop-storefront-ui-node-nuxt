<script setup lang="ts">
interface Props {
  product: ProductDetail
}

const props = defineProps<Props>()

const { t, locale, n } = useI18n()
const { productUrl } = useUrls()

const {
  axes,
  hasVariants,
  currentValueFor,
  isCurrentValue,
  variantForValue,
  resolveTarget,
  minPriceForValue,
  valueHasPriceRange,
  axisHasDistinctImages,
} = await useProductVariants(() => props.product.id)

const formatPrice = (value?: number): string => n(value ?? 0, 'currency')

// Pre-build the per-axis display data so the template stays declarative. Each
// axis becomes a URadioGroup; each value an image-or-text card.
const axisGroups = computed(() =>
  axes.value.map((axis) => {
    const visual = axisHasDistinctImages(axis.id)
    return {
      id: axis.id,
      name: axis.name,
      visual,
      items: axis.values.map((value) => {
        const variant = variantForValue(axis.id, value.id)
        return {
          value: value.id,
          label: value.value,
          image: visual ? variant?.mainImagePath : undefined,
          alt: variant
            ? extractTranslated(variant, 'name', locale.value) ?? value.value
            : value.value,
          price: minPriceForValue(axis.id, value.id),
          showFrom: valueHasPriceRange(axis.id, value.id),
        }
      }),
    }
  }),
)

async function onSelect(axisId: number, rawValue: unknown) {
  const valueId = Number(rawValue)
  if (Number.isNaN(valueId) || isCurrentValue(axisId, valueId)) return
  const target = resolveTarget(axisId, valueId)
  if (target) await navigateTo(productUrl(target.id, target.slug))
}
</script>

<template>
  <div
    v-if="hasVariants"
    class="flex flex-col gap-6"
    data-testid="variant-selector"
  >
    <div
      v-for="group in axisGroups"
      :key="group.id"
      class="flex flex-col gap-2"
    >
      <span class="text-sm font-semibold text-highlighted">
        {{ group.name }}:
      </span>

      <!-- Mobile renders as a swipe strip: snap-aligned cards, hidden
           scrollbar. The scroll container is this wrapper div, NOT the
           URadioGroup's <fieldset>: Chromium lays fieldset content out
           in a special anonymous box that neither shrinks nor clips
           reliably, so overflow-x:auto on the fieldset itself computed
           but its content still painted past it and stretched the whole
           page sideways (the mobile horizontal-scroll bug — min-w-0
           did not defeat it). Radiogroup semantics and arrow-key
           navigation live on the fieldset inside, unaffected. -->
      <div
        class="
          max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto
          max-sm:scrollbar-none
          max-sm:[&::-webkit-scrollbar]:hidden
        "
      >
        <URadioGroup
          :default-value="currentValueFor(group.id)"
          :items="group.items"
          variant="card"
          orientation="horizontal"
          indicator="hidden"
          :ui="{
            fieldset: `
              flex gap-3
              max-sm:w-max
              sm:flex-wrap
            `,
            item: `
              p-3
              max-sm:w-28 max-sm:shrink-0 max-sm:snap-start
            `,
          }"
          @update:model-value="value => onSelect(group.id, value)"
        >
          <template #label="{ item }">
            <span
              class="relative flex w-full flex-col gap-1"
              :class="group.visual ? 'sm:w-24' : 'sm:min-w-28'"
            >
              <UIcon
                v-if="isCurrentValue(group.id, Number(item.value))"
                name="i-lucide-circle-check"
                class="absolute end-0 top-0 size-5 text-primary"
              />
              <ImgWithFallback
                v-if="group.visual && item.image"
                :src="item.image"
                :alt="item.alt"
                :width="96"
                :height="96"
                fit="contain"
                background="transparent"
                quality="100"
                class="aspect-square w-full rounded-md bg-white object-contain"
              />
              <span class="truncate text-sm font-medium text-highlighted">
                {{ item.label }}
              </span>
              <span class="text-xs text-muted">
                <template v-if="item.showFrom">{{ t('from') }} </template>{{ formatPrice(item.price) }}
              </span>
            </span>
          </template>
        </URadioGroup>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  from: από
</i18n>
