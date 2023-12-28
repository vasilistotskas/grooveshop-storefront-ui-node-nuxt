<script lang="ts" setup>
const blogTagStore = useBlogTagStore()

const { tags } = storeToRefs(blogTagStore)
const { fetchBlogTags } = blogTagStore

const { locale } = useI18n()
const { extractTranslated } = useTranslationExtractor()

await fetchBlogTags({
	active: 'true',
	pagination: 'false'
})
</script>

<template>
	<aside class="grid">
		<div v-if="tags && tags?.length > 0" class="flex flex-col gap-4">
			<div class="grid items-center justify-center">
				<div class="grid items-center justify-center">
					<h3 class="text-4xl font-bold text-center">
						{{ $t('common.tags') }}
					</h3>
				</div>
			</div>
			<ul
				class="grid items-center grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
			>
				<li v-for="tag in tags" :key="tag.id" class="grid items-center justify-center">
					{{ extractTranslated(tag, 'name', locale) }}
				</li>
			</ul>
		</div>
	</aside>
</template>
