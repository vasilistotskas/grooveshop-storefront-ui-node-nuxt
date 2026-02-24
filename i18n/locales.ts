/**
 * Supported locales for the application.
 * This is used across both client and server contexts.
 */
export const SUPPORTED_LOCALES = ['el'] as const

export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: SupportedLocale = 'el'
