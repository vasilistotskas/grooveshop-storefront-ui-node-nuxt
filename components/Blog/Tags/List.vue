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
	<aside class="row-start-1 grid md:row-start-2">
		<div class="flex gap-4 md:flex-col">
			<div class="grid items-center md:justify-center">
				<h3 class="flex items-center gap-2 text-center text-2xl font-bold">
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
				class="scrollable-tags grid items-center md:gap-4"
				:grid-auto-columns="'25%'"
				component-element="ul"
				:mobile-only="true"
				slider-class="md:grid gap-4"
			>
				<li v-for="tag in filteredTags" :key="tag.id">
					<UButton color="white" variant="solid" class="flex w-full items-center"
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
