import type { StorefrontDesign } from './design.ts'
import type { ThemeColorScale, ThemeSettings } from './settings.ts'
import { TAILWIND_PALETTES } from './tailwindPalettes.ts'

const palette = (name: keyof typeof TAILWIND_PALETTES): ThemeColorScale => ({
  source: TAILWIND_PALETTES[name]['500'],
  scale: { ...TAILWIND_PALETTES[name] },
})

/**
 * The palettes every design starts from: Nuxt UI's colours as `app.config.ts`
 * sets them (primary `neutral`, neutral `zinc`) and its default secondary,
 * `blue` (Nuxt UI, "Design System", semantic colors).
 */
const scales = () => ({ primary: palette('neutral'), secondary: palette('blue'), neutral: palette('zinc') })

/**
 * The theme a new store of each design starts with: exactly what that design
 * renders for a store that changed nothing. `null` is the design of a store
 * with its own templates (webside), drawn by `main.css` `:root` / `.dark` and
 * Nuxt UI's defaults; `volt` is every other store, drawn by
 * `[data-design="volt"]`. The catalogue serves each store its design's as
 * `documentKinds.theme.defaults`, and Django writes it as the store's first
 * theme. `test/unit/shared/theme/defaults.spec.ts` holds every value to the
 * stylesheet it comes from.
 */
export function themeDefaultsFor(design: StorefrontDesign | null): ThemeSettings {
  if (design === 'volt') {
    return {
      colors: {
        light: { ...scales(), action: '#17171a', actionLinked: false, accent: '#0038e8', success: '#13703a', warning: '#8a5a00', error: '#b4232a', info: '#0030c4', liked: '#ff00bd' },
        dark: { ...scales(), action: '#f7f7f5', actionLinked: false, accent: '#4d73ff', success: '#4ade80', warning: '#fbbf24', error: '#f87171', info: '#8aa4ff', liked: '#ff00bd' },
      },
      radius: '0.75rem',
      fonts: { sans: 'manrope', display: 'geologica', mono: 'jetbrains-mono' },
      container: 'comfortable',
    }
  }
  const { neutral, green, yellow, red, blue } = TAILWIND_PALETTES
  return {
    colors: {
      light: { ...scales(), action: neutral['500'], actionLinked: true, accent: '#003dff', success: green['600'], warning: yellow['600'], error: red['600'], info: blue['600'], liked: '#ff00bd' },
      dark: { ...scales(), action: neutral['100'], actionLinked: true, accent: '#3364ff', success: green['400'], warning: yellow['400'], error: red['400'], info: blue['400'], liked: '#ff00bd' },
    },
    radius: '0.25rem',
    fonts: { sans: 'system', display: 'system', mono: 'system-mono' },
    container: 'wide',
  }
}
