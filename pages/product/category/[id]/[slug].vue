<script lang="ts" setup>
import type { Pagination } from '~/types/pagination'
import type { ProductCategory } from '~/types/product/category'

const route = useRoute('product-category-id-slug___en')

const categoryId = route.params.id

const { data: categories } = useNuxtData<Pagination<ProductCategory>>('productCategories')

await useLazyAsyncData(
	`category${categoryId}`,
	() =>
		$fetch<ProductCategory>(`/api/products/categories/${categoryId}`, {
			method: 'GET'
		}),
	{
		default() {
			return categories.value?.results?.find(
				(category) => category.id === Number(categoryId)
			)
		}
	}
)

definePageMeta({
	layout: 'default'
})
</script>

<template>
  <PageWrapper class="flex flex-col">
    <PageHeader>
      <PageTitle :text="$t('pages.category.title')" class="capitalize" />
    </PageHeader>
    <PageBody>
      <div />
    </PageBody>
  </PageWrapper>
</template>
