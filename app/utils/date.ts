export function formatDate(string: string) {
  const locale = useNuxtApp().$i18n.locale
  const date = new Date(string).toLocaleDateString(unref(locale))
  return date
}

export function formatTime(minutes: number) {
  const seconds = minutes * 60
  let secondsLeft = seconds

  const hours = Math.floor(secondsLeft / 3600)
  secondsLeft = secondsLeft % 3600

  const mins = Math.floor(secondsLeft / 60)

  return `${hours ? `${hours}h` : ''} ${mins}min`
}
