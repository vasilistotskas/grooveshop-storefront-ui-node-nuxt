<script setup>
const props = defineProps({
	path: {
		type: String,
		required: true
	},
	pageTitle: {
		type: String,
		default: ''
	}
})

const { path, pageTitle } = toRefs(props)

const { data } = await useAsyncData(path.value, () => queryContent(path.value).findOne())
</script>

<template>
	<PageWrapper>
		<PageHeader>
			<PageTitle :text="pageTitle" class="capitalize" />
		</PageHeader>
		<PageBody>
			<PageSection>
				<ContentRenderer :value="data" />
			</PageSection>
		</PageBody>
	</PageWrapper>
</template>
