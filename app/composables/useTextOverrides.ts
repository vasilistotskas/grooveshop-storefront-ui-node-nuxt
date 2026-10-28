/**
 * The store's text overrides loaded so far, by locale
 * (`app/plugins/text-overrides.ts`). `undefined` until a locale has some:
 * a store without overrides leaves the SSR payload exactly as it was.
 * Reactive, so a component that is already on screen when another
 * locale's texts arrive (the footer, on a language switch) merges them.
 */
export function useTextOverrides() {
  return useState<Record<string, TextOverrides> | undefined>('text-overrides')
}
