<script lang="ts" setup>
import { v4 as uuidv4 } from 'uuid'

const props = defineProps({
	// The text to display
	text: {
		type: String,
		required: true
	},
	// The number of characters to display before truncating
	maxChars: {
		type: Number,
		default: 100
	}
})

const uuid = uuidv4()
const { t } = useLang()
const showFullText = useState<boolean>(`${uuid}-read-more`, () => false)
const trimmedText = () => {
	if (!props.text) return props.text
	if (!props.maxChars) return props.text
	return props.text.length > props.maxChars
		? `${props.text.slice(0, props.maxChars)}...`
		: props.text
}

const toggleFullText = () => {
	showFullText.value = !showFullText.value
}
</script>

<template>
	<div v-if="text && text.length > maxChars" class="relative">
		<div v-if="!showFullText" class="overflow-hidden text-gray-700 dark:text-gray-200">
			{{ trimmedText }}
		</div>
		<div v-else class="overflow-hidden text-gray-700 dark:text-gray-200">
			{{ text }}
		</div>
		<div class="absolute bottom-0 right-0">
			<button
				type="button"
				class="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-800 dark:hover:text-gray-100"
				@click="toggleFullText"
			>
				{{ showFullText ? $t('common.read_less') : $t('common.read_more') }}
			</button>
		</div>
	</div>
	<div v-else class="text-gray-700 dark:text-gray-200">
		{{ text }}
	</div>
</template>
