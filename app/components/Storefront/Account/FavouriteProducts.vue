<script lang="ts" setup>
/**
 * The products the shopper saved, as the same cards the shop lists them
 * with. Each one is a favourite by definition, so the hearts are primed
 * from this list itself — on the server as well as in the browser, so
 * the first client render matches the server's (the shop's lists prime
 * theirs after mount for the opposite reason: there, most products are
 * not favourites). Removing one reloads the list.
 */
const { t } = useI18n()
useHead({ title: () => t('title') })
const route = useRoute()
const localePath = useLocalePath()
const { user } = useUserSession()
const { updateFavouriteProducts } = useUserStore()

const PAGE_SIZE = 12
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const { data: favourites, status, refresh } = await useApi(`/api/user/account/${user.value?.id}/favourite-products`, {
  key: `favourite-products-${user.value?.id}`,
  method: 'GET',
  query: { page, pageSize: PAGE_SIZE, ordering: '-createdAt' },
})

watch(favourites, (value) => {
  updateFavouriteProducts((value?.results ?? []).map(favourite => ({
    id: favourite.id,
    userId: favourite.userId,
    productId: favourite.product.id,
    createdAt: favourite.createdAt,
  })))
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader
      :title="t('title')"
      :lead="t('lead')"
    />
    <AccountFavouritesTabs current="products" />

    <div
      v-if="status === 'pending' && !favourites"
      class="grid grid-cols-2 gap-4 lg:grid-cols-3"
    >
      <USkeleton
        v-for="index in 3"
        :key="index"
        class="aspect-[3/4] rounded-[1.25rem]"
      />
    </div>

    <ul
      v-else-if="favourites?.results.length"
      class="grid grid-cols-2 gap-4 lg:grid-cols-3"
    >
      <li
        v-for="favourite in favourites.results"
        :key="favourite.id"
      >
        <ProductCard
          :product="favourite.product"
          @favourite-delete="() => refresh()"
        />
      </li>
    </ul>

    <div
      v-else
      class="flex flex-col items-start gap-3 rounded-[1.25rem] bg-default p-6 ring ring-default"
    >
      <p class="font-semibold text-highlighted">
        {{ t('empty.title') }}
      </p>
      <p class="text-toned">
        {{ t('empty.description') }}
      </p>
      <UButton
        :label="t('empty.cta')"
        :to="localePath('products')"
        color="neutral"
      />
    </div>

    <UPagination
      v-if="favourites && favourites.count > PAGE_SIZE"
      :page="page"
      :total="favourites.count"
      :items-per-page="PAGE_SIZE"
      :to="(target: number) => ({ query: { ...route.query, page: target > 1 ? target : undefined } })"
      class="self-center"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Αγαπημένα
  lead: Τα προϊόντα και τα άρθρα που αποθήκευσες.
  empty:
    title: Κανένα αγαπημένο προϊόν ακόμα
    description: Πάτα την καρδιά σε ένα προϊόν για να το βρίσκεις εδώ.
    cta: Δες τα προϊόντα
en:
  title: Favourites
  lead: The products and posts you saved.
  empty:
    title: No favourite products yet
    description: Tap the heart on a product to keep it here.
    cta: Browse products
</i18n>
