<template>
	<component
		:is="tag"
		v-for="({ tag, text, ...childAttrs }, idx) in children"
		:key="idx"
		v-bind="childAttrs"
	>
		{{ text }}
	</component>
</template>

<script lang="ts" setup>
import { PropType } from 'vue'
import { DynamicFormSchemaChildren } from '~/types/form'

defineProps({
	children: {
		type: Array as PropType<DynamicFormSchemaChildren>,
		required: true
	}
})
</script>
