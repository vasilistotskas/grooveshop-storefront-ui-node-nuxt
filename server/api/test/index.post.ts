export default defineWrappedResponseHandler(async (event) => {
	const body = await readBody(event)
	await useStorage().setItem('storage:test', body)
	return 'Data is set'
})
