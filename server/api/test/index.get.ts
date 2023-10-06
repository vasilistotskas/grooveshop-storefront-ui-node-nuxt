export default defineWrappedResponseHandler(async (event) => {
	const data = await useStorage().getItem('storage:test')
	if (!data) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Data not found'
		})
	}
	return data
})
