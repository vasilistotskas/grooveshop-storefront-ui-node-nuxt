import type { State } from '#cookie-control/types'

export const useCookieControl: () => State = () => useNuxtApp().$cookies as State
