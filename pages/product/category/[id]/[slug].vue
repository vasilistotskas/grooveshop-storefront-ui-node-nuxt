<script lang="ts" setup>
const config = useRuntimeConfig()
const route = useRoute('product-category-id-slug___en')
const { t } = useLang()

const categoryStore = useCategoryStore()
const categoryId = route.params.id
const { category, pending, error } = storeToRefs(categoryStore)

try {
	await categoryStore.fetchCategory(categoryId)
} catch (e) {
	//
}

definePageMeta({
	layout: 'page'
})
useHead(() => ({
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
