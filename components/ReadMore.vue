<script lang="ts" setup>
import { v4 as uuidv4 } from 'uuid'

const props = defineProps({
	text: {
		type: String,
		required: true
	},
	maxChars: {
		type: Number,
		default: 100
	}
})

const uuid = uuidv4()
const { t } = useI18n()
const showFullText = useState<boolean>(`${uuid}-read-more`, () => false)

const toggleFullText = () => {
	showFullText.value = !showFullText.value
}
</script>

<template>
	<div v-if="text && text.length > maxChars" class="relative">
		<div
			v-if="!showFullText"
			class="overflow-hidden text-primary-700 dark:text-primary-100"
		>
			{{ text.substring(0, maxChars) }} {{ text.length > maxChars ? '...' : '' }}
		</div>
		<div v-else class="overflow-hidden text-primary-700 dark:text-primary-100">
			{{ text }}
		</div>
		<div class="absolute bottom-0 right-0">
			<button
				type="button"
				class="text-sm font-semibold text-primary-700 dark:text-primary-100 hover:text-primary-800 dark:hover:text-primary-100"
				@click="toggleFullText"
			>
				{{ showFullText ? $t('common.read_less') : $t('common.read_more') }}
			</button>
		</div>
	</div>
	<div v-else class="text-primary-700 dark:text-primary-100">
		{{ text }}
	</div>
</template>
