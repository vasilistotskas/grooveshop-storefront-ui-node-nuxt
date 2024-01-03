<script lang="ts" setup>
const blogTagStore = useBlogTagStore()

const { tags } = storeToRefs(blogTagStore)
const { fetchBlogTags } = blogTagStore

const { locale } = useI18n()
const { extractTranslated } = useTranslationExtractor()

const searchQuery = ref('')
const filteredTags = computed(() => {
	return tags?.value?.filter((tag) => {
		return extractTranslated(tag, 'name', locale.value)
			.toLowerCase()
			.includes(searchQuery.value.toLowerCase())
	})
})

await fetchBlogTags({
	active: 'true',
	pagination: 'false'
})
</script>

<template>
	<aside class="grid row-start-1 md:row-start-2">
		<div class="flex md:flex-col gap-4">
			<div class="grid items-center md:justify-center">
				<h3 class="flex gap-2 items-center text-2xl font-bold text-center">
					<UIcon name="i-heroicons-tag" />
					{{ $t('common.tags') }}
				</h3>
			</div>
			<label class="sr-only" for="search">
				{{ $t('common.search') }}
			</label>
			<UInput
				id="search"
				v-model="searchQuery"
				name="search"
				icon="i-heroicons-magnifying-glass-20-solid"
				class="hidden md:grid"
				color="white"
				:trailing="false"
				variant="outline"
				:placeholder="`${$t('common.search')}...`"
			/>
			<LazyNativeSlideShow
				v-if="filteredTags && filteredTags.length > 0"
				class="grid items-center md:gap-4 scrollable-tags"
				:grid-auto-columns="'25%'"
				component-element="ul"
				:mobile-only="true"
				slider-class="md:grid gap-4"
				padding-bottom="15px"
			>
				<li v-for="tag in filteredTags" :key="tag.id">
					<UButton color="white" variant="solid" class="w-full flex items-center"
						><UIcon name="i-heroicons-hashtag" />{{
							extractTranslated(tag, 'name', locale)
						}}</UButton
					>
				</li>
			</LazyNativeSlideShow>
		</div>
	</aside>
</template>

<style lang="scss" scoped>
.scrollable-tags {
	@media screen and (min-width: 768px) {
		max-height: 300px;
		overflow-y: auto;
	}
}
</style>
