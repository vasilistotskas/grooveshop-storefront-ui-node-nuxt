import { HEX_COLOR_RE, PLATFORM_COLORS, TAILWIND_COLOR_ALLOWLIST, THEME_SHADES } from './constants.ts'
import { themeActionShadesFor, themeDefaultsFor } from './defaults.ts'
import { DESIGN_FONTS, resolveDesign } from './design.ts'
import { zThemeMetadata } from './metadataSchema.ts'
import type { ThemeMetadata } from './metadataSchema.ts'
import { THEME_PRESETS } from './presets.ts'
import type { ThemeScale } from './scale.ts'
import type { ThemeColorScale, ThemeColorScheme, ThemeSettings } from './settings.ts'
import { TAILWIND_PALETTES } from './tailwindPalettes.ts'
import type { TailwindPaletteName } from './tailwindPalettes.ts'

/** A store's theme as its Tenant fields hold it today, before it has a theme document. */
export type TenantThemeFields = Pick<TenantConfig, 'schemaName' | 'themePreset' | 'primaryColor' | 'neutralColor' | 'accentHex' | 'successHex' | 'warningHex' | 'errorHex' | 'infoHex' | 'themeMetadata'>

const hex = (value: string | null | undefined): string | null => (value && HEX_COLOR_RE.test(value) ? value.toLowerCase() : null)

/** A Tailwind palette with the shades a store wrote over it. */
function scaleOf(name: TailwindPaletteName, ...overrides: (Partial<Record<string, string>> | undefined)[]): ThemeColorScale {
  const scale = { ...TAILWIND_PALETTES[name] } as ThemeScale
  for (const override of overrides) {
    for (const shade of THEME_SHADES) {
      const value = hex(override?.[shade])
      if (value) scale[shade] = value
    }
  }
  return { source: scale['500'], scale }
}

const paletteName = (value: string | null | undefined, fallback: TailwindPaletteName): TailwindPaletteName =>
  value && TAILWIND_COLOR_ALLOWLIST.has(value) && value in TAILWIND_PALETTES ? value as TailwindPaletteName : fallback

/**
 * The theme document that renders a store exactly as its Tenant fields do
 * today, for the one-off move of the existing stores onto the theme document
 * (`pnpm theme:seed`). It reads the fields the way the render read them: the
 * Tailwind names the tenant plugin handed Nuxt UI, then every rule of the
 * Tenant-field compiler, which wrote only what a store changed, over its
 * design's defaults (`themeDefaultsFor`), which hold what the design's
 * stylesheet paints. A `theme_metadata` that does not validate is read as
 * none. Both are gone from the render; `seed.spec.ts` holds the seed to what
 * they drew for the production stores.
 */
export function seedThemeSettings(fields: TenantThemeFields): ThemeSettings {
  const design = resolveDesign(fields.schemaName)
  const defaults = themeDefaultsFor(design)
  const parsed = zThemeMetadata.safeParse(fields.themeMetadata ?? {})
  const metadata: ThemeMetadata = parsed.success ? parsed.data : {}
  const preset = THEME_PRESETS[fields.themePreset || 'default'] ?? THEME_PRESETS.default!

  const primary = paletteName(fields.primaryColor, 'neutral')
  const neutral = paletteName(fields.neutralColor, 'zinc')

  // The accent: an accentHex the store changed, else a custom secondary
  // scale's 500 (400 in the dark), else the design's; accentDarkHex wins in
  // the dark ("accentHex maps to --ui-secondary only").
  const accentHex = hex(fields.accentHex)
  const accentCustomized = accentHex !== null && accentHex !== PLATFORM_COLORS.secondary
  const secondaryScale = metadata.colors?.secondaryScale
  const sharedAccent = accentCustomized ? accentHex : hex(secondaryScale?.['500'])
  const darkAccentHex = hex(metadata.accentDarkHex)
  const darkAccent = sharedAccent
    ? darkAccentHex ?? (accentCustomized ? null : hex(metadata.darkColors?.secondaryScale?.['400']) ?? hex(secondaryScale?.['400'])) ?? sharedAccent
    : darkAccentHex

  const status = (field: 'successHex' | 'warningHex' | 'errorHex' | 'infoHex', baseline: string) => {
    const value = hex(fields[field])
    return value && value !== baseline ? value : null
  }
  const success = status('successHex', PLATFORM_COLORS.success)
  const warning = status('warningHex', PLATFORM_COLORS.warning)
  const error = status('errorHex', PLATFORM_COLORS.error)
  const info = status('infoHex', PLATFORM_COLORS.info)
  const liked = hex(metadata.likedHex)

  const scheme = (name: 'light' | 'dark'): ThemeColorScheme => {
    const darkScales = name === 'dark' ? metadata.darkColors : undefined
    const base = defaults.colors[name]
    const scales = {
      primary: scaleOf(primary, metadata.colors?.primaryScale, darkScales?.primaryScale),
      secondary: scaleOf('blue', metadata.colors?.secondaryScale, darkScales?.secondaryScale),
      neutral: scaleOf(neutral, metadata.colors?.neutralScale, darkScales?.neutralScale),
    }
    return {
      ...scales,
      // A design that paints --ui-primary from the scale (Nuxt UI's 500, and
      // main.css's 100 in the dark) follows the store's scale; Volt's ink is its own.
      action: base.actionLinked ? scales.primary.scale[themeActionShadesFor(design)[name]] : base.action,
      actionLinked: base.actionLinked,
      accent: (name === 'light' ? sharedAccent : darkAccent) ?? base.accent,
      success: success ?? base.success,
      warning: warning ?? base.warning,
      error: error ?? base.error,
      info: info ?? base.info,
      liked: liked ?? base.liked,
    }
  }

  // Radius and width are written only when they are not the platform's
  // (0.25rem, `wide`); otherwise the design's own stand.
  const radius = metadata.radius ?? preset.radius
  const container = metadata.container ?? preset.container

  // The faces as the Tenant path picked them; a role it leaves unset is the
  // stylesheet's: the design's face, or main.css's (display follows sans).
  const designFonts = design ? DESIGN_FONTS[design] : undefined
  const chosenSans = metadata.fontSans ?? preset.fontSans
  const sans = (chosenSans !== 'system' ? chosenSans : designFonts?.sans) ?? defaults.fonts.sans
  const display = metadata.fontDisplay ?? designFonts?.display ?? sans
  const mono = metadata.fontMono ?? designFonts?.mono ?? defaults.fonts.mono

  return {
    colors: { light: scheme('light'), dark: scheme('dark') },
    radius: radius !== '0.25rem' ? radius : defaults.radius,
    fonts: { sans, display, mono },
    container: container !== 'wide' ? container : defaults.container,
  }
}
