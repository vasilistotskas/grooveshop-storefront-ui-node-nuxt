export function formatDate(string: string) {
	// @ts-ignore
	const locale = useNuxtApp().$i18n.locale
	const date = new Date(string).toLocaleDateString(unref(locale))
	return date
}

/**
 * Format minutes into hours and mins
 */
export function formatTime(minutes: number) {
	// seconds
	const seconds = minutes * 60
	let secondsLeft = seconds

	// hours
	const hours = Math.floor(secondsLeft / 3600)
	secondsLeft = secondsLeft % 3600

	// mins
	const mins = Math.floor(secondsLeft / 60)
	secondsLeft = secondsLeft % 60

	return `${hours ? `${hours}h` : ''} ${mins}min`
}
