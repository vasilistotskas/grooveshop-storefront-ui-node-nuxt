<script lang="ts" setup>
definePageMeta({
	layout: 'testing'
})
</script>
<template>
	<PageWrapper class="container min-h-full">
		<PageHeader>
			<PageTitle :text="$t('pages.testing.blank.title')" class="capitalize" />
		</PageHeader>
		<PageBody>
			<PageSection>
				<div v-for="i in 30" :key="i" class="text-6xl uppercase">
					<p class="text-primary-700 dark:text-primary-100">
						{{ $t('pages.testing.blank.just_blank_page_with_title') }}
					</p>
				</div>
			</PageSection>
		</PageBody>
	</PageWrapper>
</template>
