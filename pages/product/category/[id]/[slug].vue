<script lang="ts" setup>
const productCategoryStore = useProductCategoryStore()
const { category } = storeToRefs(productCategoryStore)
const { fetchCategory } = productCategoryStore

const route = useRoute('product-category-id-slug___en')

const categoryId = route.params.id

await fetchCategory(categoryId)

definePageMeta({
	layout: 'page'
})
useServerHead(() => ({
	title: capitalize(category.value?.seoTitle || ''),
	meta: [
		{
			name: 'description',
			content: category.value?.seoDescription || ''
		},
		{
			name: 'keywords',
			content: category.value?.seoKeywords || ''
		}
	]
}))
</script>

<template>
	<PageWrapper class="flex flex-col">
		<PageHeader>
			<PageTitle :text="$t('pages.category.title')" class="capitalize" />
		</PageHeader>
		<PageBody>
			<div></div>
		</PageBody>
	</PageWrapper>
</template>
