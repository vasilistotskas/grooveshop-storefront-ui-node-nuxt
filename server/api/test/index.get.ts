type RedisData = {
	text: string
}

export default defineEventHandler(async (event) => {
	const data = await useStorage<RedisData>().getItem('redis:test')
	if (!data) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Data not found'
		})
	}
	return data
})
