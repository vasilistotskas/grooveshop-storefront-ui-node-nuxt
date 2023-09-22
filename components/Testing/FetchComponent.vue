<template>
	<div>{{ data?.title }}</div>
</template>

<script lang="ts" setup>
type Todo = {
	userId: number
	id: number
	title: string
	completed: boolean
}
const { data } = await useFetch<Todo>('https://jsonplaceholder.typicode.com/todos/1')
</script>
