import * as z from 'zod'
import {
  FONT_ALLOWLIST,
  HEX_COLOR_RE,
  RADIUS_ALLOWLIST,
  CONTAINER_MAP,
} from './constants'

/**
 * Validated shape of ``Tenant.theme_metadata`` — per-token overrides on
 * top of the ``themePreset`` bundle.
 *
 * The Django JSONField is free-form on the wire (the generated OpenAPI
 * type is opaque JSON), so THIS parse is the render-time authority: the
 * token compiler ``safeParse``s the metadata and falls back to the
 * preset on failure. ``strict()`` rejects unknown keys so a typo'd
 * override surfaces in logs instead of silently doing nothing.
 *
 * A plain-Python mirror validates writes in Django
 * (``tenant/validators.py::validate_theme_metadata``) — keep the two in
 * sync when adding tokens.
 */

const zHex6 = z.string().regex(HEX_COLOR_RE)

const zShadeScale = z
  .object({
    50: zHex6, 100: zHex6, 200: zHex6, 300: zHex6, 400: zHex6,
    500: zHex6, 600: zHex6, 700: zHex6, 800: zHex6, 900: zHex6,
    950: zHex6,
  })
  .partial()

export const zThemeMetadata = z
  .object({
    radius: z.enum([...RADIUS_ALLOWLIST] as [string, ...string[]]).optional(),
    fontSans: z
      .enum(Object.keys(FONT_ALLOWLIST) as [string, ...string[]])
      .optional(),
    container: z
      .enum(Object.keys(CONTAINER_MAP) as [string, ...string[]])
      .optional(),
    // Custom-preset escape hatch: literal-hex overrides for the named
    // Nuxt UI color scales. Partial — only the shades provided are
    // emitted, on top of the named palette.
    colors: z
      .object({
        primaryScale: zShadeScale.optional(),
        neutralScale: zShadeScale.optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export type ThemeMetadata = z.infer<typeof zThemeMetadata>
