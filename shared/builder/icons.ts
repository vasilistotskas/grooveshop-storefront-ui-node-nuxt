/**
 * The icons the page builder offers, written `i-<set>-<name>` as the stores
 * save them: the ONE list behind every `builderField.icon()` setting (the
 * editor shows it as a choice, each option named in
 * `app/builder/labels/<locale>.json` under `options.icon`) and behind the
 * icon client bundle (`nuxt.config.ts`, `icon.clientBundle`, through
 * `builderIconBundleName`).
 *
 * The bundle is what lets the SERVER paint an icon: in CSS mode @nuxt/icon
 * builds a mask on the server only from that bundle, which a source scan
 * fills, and a name a store picked in the editor is data, never in the
 * source. A name outside the bundle renders as an empty box until its
 * section hydrates (2026-11-13: the security band's shield on staging).
 *
 * It imports nothing: `nuxt.config.ts` reads it in Node, outside the app's
 * type graph (the upgrade is `iconUpgrades.ts`). Adding one: append it here,
 * from one of `BUILDER_ICON_SETS`, name it in both label files, and the
 * editor offers it and the server paints it. It holds every icon the stores
 * had published on 2026-11-13, the trust badge's preset, and the icons the
 * bundle listed for database content before it.
 */
export const BUILDER_ICONS = [
  'i-fa6-solid-desktop',
  'i-fa6-solid-globe',
  'i-fa6-solid-microchip',
  'i-fa6-solid-mobile',
  'i-fa6-solid-network-wired',
  'i-fa6-solid-robot',
  'i-fa6-solid-shield',
  'i-fa6-solid-shuffle',
  'i-heroicons-arrow-uturn-left',
  'i-heroicons-briefcase',
  'i-heroicons-building-storefront',
  'i-heroicons-chat-bubble-left-right',
  'i-heroicons-globe-europe-africa',
  'i-heroicons-hand-raised',
  'i-heroicons-information-circle',
  'i-heroicons-lifebuoy',
  'i-heroicons-light-bulb',
  'i-heroicons-lock-closed',
  'i-heroicons-rectangle-group',
  'i-heroicons-shield-check',
  'i-heroicons-shopping-bag',
  'i-heroicons-sparkles',
  'i-heroicons-sun',
  'i-heroicons-truck',
  'i-lucide-battery-charging',
  'i-lucide-code',
  'i-lucide-cpu',
  'i-lucide-drafting-compass',
  'i-lucide-gauge',
  'i-lucide-graduation-cap',
  'i-lucide-hard-hat',
  'i-lucide-radio',
  'i-lucide-shield',
  'i-lucide-shield-check',
  'i-lucide-sliders-horizontal',
  'i-lucide-traffic-cone',
  'i-lucide-wrench',
  'i-lucide-zap',
] as const

export type BuilderIcon = (typeof BUILDER_ICONS)[number]

/** The icon sets the list draws from: installed `@iconify-json/*` packages, in the server bundle too. */
export const BUILDER_ICON_SETS = ['fa6-solid', 'heroicons', 'lucide'] as const

/**
 * An icon of the list as the icon bundle names it, `i-<set>:<name>`: the
 * bundle splits a name at its colon, and a set's own name may hold a hyphen
 * (`fa6-solid`), so the set is read off `BUILDER_ICON_SETS`.
 */
export function builderIconBundleName(icon: BuilderIcon): string {
  const set = BUILDER_ICON_SETS.find(candidate => icon.startsWith(`i-${candidate}-`))
  if (!set) throw new Error(`${icon} is from none of BUILDER_ICON_SETS`)
  return `i-${set}:${icon.slice(`i-${set}-`.length)}`
}

/**
 * The list's entry for an icon name as a store saved it: the same name, or
 * its `i-<set>:<name>` spelling, which @nuxt/icon reads alike and which the
 * free-text field took before the list (`i-lucide:shield`). `undefined` for
 * a name the list does not hold.
 */
export function builderIconOf(name: string): BuilderIcon | undefined {
  return BUILDER_ICONS.find(icon => icon === name || icon === name.replace(':', '-'))
}
