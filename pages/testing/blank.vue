<script lang="ts" setup>
import { capitalize } from '~/utils/str'

const config = useRuntimeConfig()
const { t } = useLang()

definePageMeta({
	layout: 'testing'
})
useHead(() => ({
	title: capitalize(t('pages.testing.blank.title')),
	meta: [
		{
			name: 'description',
			content: t('pages.testing.blank.description')
		}
	]
}))
</script>

<template>
	<PageWrapper>
		<PageHeader>
			<PageTitle :text="$t('pages.testing.blank.title')" class="capitalize" />
		</PageHeader>
		<PageBody>
			<PageSection>
				<div v-for="i in 30" :key="i" class="text-6xl uppercase">
					<p class="text-gray-700 dark:text-gray-200">
						{{ $t('pages.testing.blank.just_blank_page_with_title') }}
					</p>
				</div>
			</PageSection>
		</PageBody>
	</PageWrapper>
</template>
