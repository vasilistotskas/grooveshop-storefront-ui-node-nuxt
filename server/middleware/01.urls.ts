export default defineEventHandler((event) => {
	const url = event.node.req.url
	const urlQuery = url?.split('?')[1]

	const query = urlQuery
		?.split('&')
		.filter((param) => {
			const [key, value] = param.split('=')
			return value !== 'undefined' && value !== 'null'
		})
		.join('&')

	if (urlQuery && query) {
		event.node.req.url = url?.split('?')[0] + '?' + query
	}
})
