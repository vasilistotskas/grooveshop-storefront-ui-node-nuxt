<script setup lang="ts">
/**
 * The product's variant axes — colour, capacity, length — one radio
 * group per axis. Choosing a value opens that variant's own page.
 *
 * An axis whose variants have photographs of their own is a row of
 * photo swatches, labelled with the chosen value ("Colour: Black");
 * any other axis is a grid of cards carrying the value and its price.
 * A value whose variant is sold out stays choosable — its page says so
 * and offers the restock alert — but reads dimmed.
 */
interface Props {
  product: ProductDetail
}

const props = defineProps<Props>()

const { t, locale, n } = useI18n()
const localePath = useLocalePath()
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

const axisGroups = computed(() =>
  axes.value.map((axis) => {
    const visual = axisHasDistinctImages(axis.id)
    const current = currentValueFor(axis.id)
    return {
      id: axis.id,
      name: axis.name,
      visual,
      currentLabel: axis.values.find(value => value.id === current)?.value,
      items: axis.values.map((value) => {
        const variant = variantForValue(axis.id, value.id)
        const price = minPriceForValue(axis.id, value.id)
        return {
          value: value.id,
          label: value.value,
          image: visual ? variant?.mainImagePath : undefined,
          alt: variant
            ? extractTranslated(variant, 'name', locale.value) ?? value.value
            : value.value,
          price: valueHasPriceRange(axis.id, value.id)
            ? t('from_price', { price: n(price ?? 0, 'currency') })
            : n(price ?? 0, 'currency'),
          soldOut: (variant?.stock ?? 0) <= 0,
        }
      }),
    }
  }),
)

async function onSelect(axisId: number, rawValue: unknown) {
  const valueId = Number(rawValue)
  if (Number.isNaN(valueId) || isCurrentValue(axisId, valueId)) return
  const target = resolveTarget(axisId, valueId)
  if (target) await navigateTo(localePath({ path: productUrl(target.id, target.slug) }))
}

const LEGEND = 'mb-3 text-sm font-bold text-highlighted'
// The chosen swatch's ring is ink, marked important: Volt colours every
// outline with the accent from an unlayered rule (main.css).
</script>

<template>
  <div
    v-if="hasVariants"
    class="flex flex-col gap-4"
    data-testid="variant-selector"
  >
    <template
      v-for="group in axisGroups"
      :key="group.id"
    >
      <URadioGroup
        v-if="group.visual"
        :default-value="currentValueFor(group.id)"
        :items="group.items"
        :legend="group.name"
        orientation="horizontal"
        indicator="hidden"
        :ui="{
          legend: LEGEND,
          fieldset: 'flex-wrap gap-2.5',
          item: `
            size-16 overflow-hidden rounded-[0.875rem] bg-elevated p-0
            outline-offset-2
            has-data-[state=checked]:outline-2
            has-data-[state=checked]:outline-inverted!
          `,
          wrapper: 'size-full',
        }"
        @update:model-value="value => onSelect(group.id, value)"
      >
        <template #legend>
          {{ group.name }}:
          <span class="font-medium">{{ group.currentLabel }}</span>
        </template>
        <template #label="{ item }">
          <ImgWithFallback
            v-if="item.image"
            :src="item.image"
            alt=""
            :width="64"
            :height="64"
            fit="cover"
            densities="x1 x2"
            quality="75"
            class="size-16 object-cover"
            :class="item.soldOut && 'opacity-45'"
          />
          <span class="sr-only">
            {{ item.alt }}{{ item.soldOut ? ` — ${t('sold_out')}` : '' }}
          </span>
        </template>
      </URadioGroup>

      <URadioGroup
        v-else
        :default-value="currentValueFor(group.id)"
        :items="group.items"
        :legend="group.name"
        variant="card"
        orientation="horizontal"
        indicator="hidden"
        :ui="{
          legend: LEGEND,
          fieldset: 'grid grid-cols-3 gap-2',
          item: 'rounded-[0.875rem] px-3 py-2.5',
          wrapper: 'items-start gap-0.5 text-start',
        }"
        @update:model-value="value => onSelect(group.id, value)"
      >
        <template #label="{ item }">
          <span
            class="flex flex-col gap-0.5"
            :class="item.soldOut && 'opacity-45'"
          >
            <span class="text-sm font-bold text-highlighted">{{ item.label }}</span>
            <span class="font-mono text-xs text-muted">{{ item.price }}</span>
            <span
              v-if="item.soldOut"
              class="sr-only"
            >{{ t('sold_out') }}</span>
          </span>
        </template>
      </URadioGroup>
    </template>
  </div>
</template>

<i18n lang="yaml">
el:
  from_price: 'από {price}'
  sold_out: Εξαντλήθηκε
en:
  from_price: 'from {price}'
  sold_out: Sold out
</i18n>
