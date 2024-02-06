export function parseBoolean(value: any): boolean | undefined {
	if (value === true || value === 'true') {
		return true
	} else if (value === false || value === 'false') {
		return false
	} else {
		if (typeof value === 'string') {
			const trimmedValue = value.trim().toLowerCase()
			if (trimmedValue === 'true') return true
			if (trimmedValue === 'false') return false
		} else if (typeof value === 'number') {
			if (value === 1) return true
			if (value === 0) return false
		}
		// eslint-disable-next-line no-console
		console.error('Invalid input type or value')
		return undefined
	}
}
